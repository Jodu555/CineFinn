import Swal from 'sweetalert2';

declare module '#app' {
    interface NuxtApp {
        $swal: typeof Swal;
        $toast: typeof Swal;
    }
}

export { }