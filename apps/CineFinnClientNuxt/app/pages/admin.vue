<template>
    <div v-auto-animate class="container-fluid">
        <div class="row flex-nowrap">
            <div class="col-auto col-md-3 col-xl-2 px-sm-2 px-0">
                <div class="d-flex flex-column align-items-center align-items-sm-start px-3 pt-2 text-white">
                    <a href="/"
                        class="d-flex align-items-center pb-3 mb-md-0 me-md-auto text-white text-decoration-none">
                        <NuxtLink class="nav-link px-0 align-middle" to="/admin"><span
                                class="fs-5 d-none d-sm-inline">Admin Area</span></NuxtLink>
                    </a>
                    <ul class="nav flex-column mb-sm-auto mb-0 align-items-center align-items-sm-start" id="menu">
                        <li class="nav-item">
                            <NuxtLink class="nav-link px-0 align-middle" exact-active-class="active" to="/admin/"><span
                                    class="ms-1 d-none d-sm-inline">Overview</span></NuxtLink>
                        </li>
                        <li>
                            <NuxtLink class="nav-link px-0 align-middle" exact-active-class="active"
                                to="/admin/accounts"><span class="ms-1 d-none d-sm-inline">Accounts</span></NuxtLink>
                        </li>
                    </ul>
                </div>
            </div>
            <div class="col py-3" v-auto-animate>
                <NuxtPage />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>

definePageMeta({
    middleware: 'auth',
});

</script>

<style scoped>
.nav-link.active {
    text-decoration: underline;
}
</style>