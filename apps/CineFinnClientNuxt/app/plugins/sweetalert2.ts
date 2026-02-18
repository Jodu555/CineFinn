import Swal from 'sweetalert2'
export default defineNuxtPlugin((nuxtApp) => {


    const toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        },

    })

    nuxtApp.provide('swal', Swal)
    nuxtApp.provide('toast', toast)
})