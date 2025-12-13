import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getConfig } from '../config.js';
import type { Email, EmailTypes } from '@cinefinn/types/database';
import { accountsTable, emailsTable } from '../database.js';
import { generateEmailID } from './IdGenerators.js';

// type EmailTypeData<K extends EmailTypes> = {
//     [key in K]: K extends 'VERIFICATION' ? { email: string; verificationToken: string; } : K extends 'DISCOUNT' ? { discountAmount: number; discountCode: string; } : never;
// };

// type EmailTypeDataD = {
//     VERIFICATION: { email: string; verificationToken: string; };
//     DISCOUNT: { discountAmount: number; discountCode: string; };
// } & Record<EmailTypes, { [key: string]: string; }>;

// export type EmailTypes = 'VERIFICATION' | 'INVOICE_OPENED' | 'INVOICE_DUE' | 'DISCOUNT' | 'VIDEO_ABT_DELETED' | 'RECORDING_AUTO_STARTED' | 'RECORDING_AUTO_ENDED';

// type DataType<T extends EmailTypes> = T extends 'VERIFICATION' ? { email: string; verificationToken: string; } : never;

// type DataType<T> = T extends 'VERIFICATION' ? { email: string; verificationToken: string; } : never;

type DataType<T> =
  T extends 'VERIFICATION' ? { verificationToken: string; } :
  undefined;

export default class EmailManager {
  transporter: nodemailer.Transporter;
  ready: boolean = false;
  inflight: boolean = false;
  constructor() {
    const globalConfig = getConfig();
    const config = {
      service: 'gmail',
      host: globalConfig.smtp.host,
      port: globalConfig.smtp.port,
      secure: globalConfig.smtp.secure,
      auth: {
        user: globalConfig.smtp.auth.user,
        pass: globalConfig.smtp.auth.pass,
      },
    };

    this.transporter = nodemailer.createTransport(config);

    let outherThis = this;
    this.transporter.verify(function (error, success) {
      console.log({ error, success });

      if (error) {
        console.log('Error verifying email transporter:', error);
      }
      if (success) {
        console.log('Email transporter is ready');
        outherThis.ready = true;
        outherThis.processEmails();
      }
    });
  }

  async processEmails() {
    // console.log('Processing emails...', this.ready, this.inflight);
    if (!this.ready) {
      console.log('Email transporter not ready, skipping email processing');
      setTimeout(() => this.processEmails(), 1000 * 60 * 5); // Retry in 5 minutes
      return;
    }
    if (this.inflight) {
      console.log('Email processing already in flight, skipping this round');
      setTimeout(() => this.processEmails(), 1000 * 60 * 5); // Retry in 5 minutes
      return;
    }
    const emails = await emailsTable.get({ status: 'PENDING' });
    for (const email of emails) {
      if (email.status == 'PENDING') {
        await this.deepSendEmail(email);
      }
    }
    setTimeout(() => this.processEmails(), 1000 * 60 * 5); // Check for stall emails every 5 minutes
  }

  async sendEmail<T extends EmailTypes>(account_UUID: string, email_type: T, data: DataType<T> & { email?: string; }) {
    this.inflight = true;
    try {

      data.email = data.email || (await accountsTable.getOne({ UUID: account_UUID }))?.email;
      const obj = await this.getEmailData(email_type, data);

      const email: Email = {
        UUID: generateEmailID(),
        account_UUID,
        email_type,
        status: 'PENDING',
        data: JSON.stringify(data),
        sent_at: -1,
        created_at: Date.now(),
        ...obj,
      } satisfies Email;

      await emailsTable.create(email);

      await this.deepSendEmail(email);
    } catch (error) {
      console.log('Error sending email:', error, account_UUID, email_type, data);
    } finally {
      this.inflight = false;
    }
  }

  async getEmailData<T extends EmailTypes>(email_type: T, data: any): Promise<{ subject: string; html: string; text: string; }> {
    if (email_type === 'VERIFICATION') {
      return this.generateEmailVerification(data);
    }
    throw new Error('Email type not found');
  }

  private async deepSendEmail(email: Email) {

    if (typeof email.data === 'string') {
      email.data = JSON.parse(email.data);
    }

    if (!this.ready) {
      console.log('Email transporter not ready for', email.UUID);
      return;
    }

    this.transporter.sendMail(
      {
        from: process.env.MAIL_APP_MAIL,
        to: (email.data as any).email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      },
      function (error, info) {
        if (error) {
          console.log(error);
          return;
        } else {
          console.log('Email sent:', { ID: email.UUID, subject: email.subject, to: (email.data as any).email });
          email.sent_at = Date.now();
          email.status = 'SENT';
          email.data = JSON.stringify(email.data);
          emailsTable.update({ UUID: email.UUID }, email);
        }
      }
    );
  }

  generateEmailVerification(data: DataType<'VERIFICATION'> & { email: string; }) {
    const { email, verificationToken } = data;

    const html = `<!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .email-container {
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid #e0e0e0;
              }
              .email-header {
                background-color: #4f46e5;
                padding: 20px;
                text-align: center;
              }
              .email-header h1 {
                color: white;
                margin: 0;
                font-size: 24px;
              }
              .email-body {
                background-color: #ffffff;
                padding: 30px;
              }
              .email-footer {
                background-color: #f9fafb;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #6b7280;
              }
              .button {
                display: inline-block;
                background-color: #4f46e5;
                color: white;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 4px;
                font-weight: bold;
                margin: 20px 0;
              }
              .code {
                background-color: #f1f5f9;
                padding: 12px;
                border-radius: 4px;
                font-family: monospace;
                text-align: center;
                font-size: 18px;
                letter-spacing: 2px;
                margin: 20px 0;
                color: #4f46e5;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">
                <h1>Email Verification</h1>
              </div>
              <div class="email-body">
                <p>Hello ${email},</p>
                <p>Thank you for signing up! To complete your registration and verify your email address, please input the following code on the registration page:</p>
                
                <div style="text-align: center;">
                  <h3 class="code">${verificationToken}</h3>
                </div>
                
                <p>If you didn't create an account, you can safely ignore this email.</p>
                
                <p>Best regards,<br>The CineFinn App</p>
              </div>
              <div class="email-footer">
                <p>© ${new Date().getFullYear()} CineFinn. All rights reserved.</p>
                <p>If you need any assistance, please just reply to this email!</p>
              </div>
            </div>
          </body>
          </html>`;

    const text = `
          Hello ${email},
          
          Thank you for signing up! To complete your registration, please input the following code on the registration page:
          
          ${verificationToken}
          
          If you didn't create an account, you can safely ignore this email.
          
          Best regards,
          The CineFinn App
        `;

    return { subject: 'Email Verification', html, text };
  }

}