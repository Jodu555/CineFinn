export enum Role {
    Admin = 3,
    Mod = 2,
    User = 1,
}

export interface Account {
    UUID: string;
    username: string;
    password?: string;
    email: string;
    role: Role;
    settings: SettingsObject;
    emailVerifyCode: string;
    activityDetails: {
        lastHandshake: string;
        lastLogin: string;
    };
    status: 'active' | 'suspended' | 'deleted' | 'trial';
}

type SettingsObjectType = 'hide' | 'text' | 'select' | 'checkbox';

type SettingsValueCheckbox = {
    title: string;
    value: boolean;
    type: 'checkbox';
};

type SettingsValueText = {
    title: string;
    value: string;
    type: 'text';
};

type SettingsValueSelect = {
    title: string;
    value: string;
    type: 'select';
    options: string[];
};

type SettingsValueHide = {
    value: string;
    type: 'hide';
};

type SettingsKey = 'preferredLanguage' | 'showVideoTitleContainer' | 'showLatestWatchButton' | 'developerMode' | 'showNewsAddForm' | 'autoSkip' | 'skipSegments' | 'enableBetaFeatures' | 'volume';

export type SettingsObject = {
    preferredLanguage: {
        title: string;
        value: string;
        type: 'select';
        options: string[];
    };
    showVideoTitleContainer: {
        title: string;
        type: 'checkbox';
        value: boolean;
    };
    showLatestWatchButton: {
        title: string;
        type: 'checkbox';
        value: boolean;
    };
    developerMode: {
        title: string;
        type: 'checkbox';
        value: boolean;
    };
    autoSkip: {
        title: string;
        type: 'checkbox';
        value: boolean;
    };
    skipSegments: {
        title: string;
        type: 'checkbox';
        value: boolean;
    };
    enableBetaFeatures: {
        title: string;
        type: 'checkbox';
        value: boolean;
    };
    volume: {
        type: 'hide';
        value: number;
    };
};

export interface AuthToken {
    TOKEN: string;
    account_UUID: string;
}

export interface Email {
    UUID: string;
    account_UUID: string;
    email_type: EmailTypes;
    status: EmailStatus;
    subject: string;
    html: string;
    text: string;
    data: string;
    sent_at: number;
    created_at: number;
}

export type EmailTypes = 'VERIFICATION' | 'PASSWORD_RESET';
export type EmailStatus = 'PENDING' | 'SENT';
