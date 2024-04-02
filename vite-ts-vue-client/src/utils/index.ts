import type { SweetAlertOptions } from 'sweetalert2';
import axios, { type AxiosInstance } from 'axios';
import type { App } from 'vue';

function setCookie(cname: string, cvalue: string, exdays: number) {
	var d = new Date();
	d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
	var expires = 'expires=' + d.toUTCString();
	document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
}

function getCookie(cname: string) {
	var name = cname + '=';
	var decodedCookie = decodeURIComponent(document.cookie);
	var ca = decodedCookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return '';
}

function deleteCookie(cname: string) {
	setCookie(cname, '-1', -1);
}

function useBaseURL(): string {
	if (location.hostname == 'localhost' || location.hostname.includes('192.168')) {
		return `http://${location.hostname}:3100`;
		//  return 'http://cinema-api.jodu555.de';
	} else {
		return 'http://cinema-api.jodu555.de';
	}
}

let instance: AxiosInstance | null = null;

function useAxios() {
	if (instance != null) {
		return instance;
	}
	// const instance = axios.create({
	instance = axios.create({
		baseURL: useBaseURL(),
		headers: {
			'auth-token': getCookie('auth-token'),
		},
	});

	instance.interceptors.response.use(
		(response) => {
			return response;
		},
		function (error) {
			return error.response;
		}
	);
	return instance;
}

let app: App<Element> | undefined = undefined;

export function setApp(_app: App<Element>) {
	app = _app;
}

export function getApp(): App<Element> {
	return app as App<Element>;
}

export function useSwal(opts: SweetAlertOptions) {
	return getApp()._instance?.appContext.config.globalProperties.$swal(opts);
}

export { useAxios, useBaseURL, setCookie, getCookie, deleteCookie };
