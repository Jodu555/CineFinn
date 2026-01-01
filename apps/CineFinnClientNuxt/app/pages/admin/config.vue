<template>
    <div class="container-fluid py-4" data-bs-theme="dark">
        <!-- Page Header -->
        <div class="d-flex justify-content-between align-items-center mb-4 border-bottom border-secondary pb-3">
            <div>
                <h1 class="h3 mb-0">
                    <font-awesome-icon :icon="['fas', 'sliders']" class="me-2 text-primary" />
                    System Configuration
                </h1>
                <p class="text-muted mb-0">Manage environment variables and service settings</p>
            </div>
            <div>
                <span class="badge bg-primary fs-6">v{{ config?.version }}</span>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="alert alert-danger" role="alert">
            <font-awesome-icon :icon="['fas', 'triangle-exclamation']" class="me-2" />
            Error loading configuration: {{ error }}
        </div>

        <!-- Config Grid -->
        <div v-else-if="config" class="row g-4">

            <!-- System & Paths -->
            <div class="col-12 col-lg-6">
                <div class="card h-100 bg-body-tertiary border-secondary shadow-sm">
                    <div class="card-header bg-transparent border-secondary fw-bold">
                        <font-awesome-icon :icon="['fas', 'server']" class="me-2 text-info" />
                        System & Paths
                    </div>
                    <div class="card-body">
                        <ul class="list-group list-group-flush bg-transparent">
                            <ConfigItem label="Version" :value="config.version" icon="code-branch" />
                            <ConfigItem label="API Endpoint" :value="config.system.PUBLIC_API_ENDPOINT" icon="globe" />
                            <ConfigItem label="Port" :value="config.system.PORT" icon="network-wired" />
                            <!-- Paths can be long, fixed wrapping here -->
                            <ConfigItem label="Video Path" :value="config.videoPath" updateKey="config.videoPath"
                                icon="film" :editable="true" @update="handleUpdate" />
                            <ConfigItem label="Image Path" :value="config.imagePath" updateKey="config.imagePath"
                                icon="image" :editable="true" @update="handleUpdate" />
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Database & Redis -->
            <div class="col-12 col-lg-6">
                <div class="row g-4 h-100">
                    <!-- Database -->
                    <div class="col-12 col-md-6">
                        <div class="card h-100 bg-body-tertiary border-secondary shadow-sm">
                            <div class="card-header bg-transparent border-secondary fw-bold">
                                <font-awesome-icon :icon="['fas', 'database']" class="me-2 text-warning" />
                                Database
                            </div>
                            <div class="card-body">
                                <ul class="list-group list-group-flush bg-transparent">
                                    <ConfigItem label="Host" :value="config.database.host"
                                        updateKey="config.database.host" icon="server" :editable="true"
                                        @update="handleUpdate" />
                                    <ConfigItem label="Database" :value="config.database.database"
                                        updateKey="config.database.database" icon="table" />
                                    <ConfigItem label="Username" :value="config.database.username"
                                        updateKey="config.database.username" icon="user" :editable="true"
                                        @update="handleUpdate" />
                                    <ConfigItem label="Password" :value="config.database.password"
                                        updateKey="config.database.password" icon="lock" is-sensitive />
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Redis -->
                    <div class="col-12 col-md-6">
                        <div class="card h-100 bg-body-tertiary border-secondary shadow-sm">
                            <div class="card-header bg-transparent border-secondary fw-bold">
                                <font-awesome-icon :icon="['fas', 'bolt']" class="me-2 text-danger" />
                                Redis
                            </div>
                            <div class="card-body">
                                <ul class="list-group list-group-flush bg-transparent">
                                    <ConfigItem label="Host" :value="config.redis.host" updateKey="config.redis.host"
                                        icon="server" :editable="true" @update="handleUpdate" />
                                    <ConfigItem label="Port" :value="config.redis.port" updateKey="config.redis.port"
                                        icon="plug" type="number" :editable="true" @update="handleUpdate" />
                                    <ConfigItem label="Password" :value="config.redis.password"
                                        updateKey="config.redis.password" icon="key" is-sensitive :editable="true"
                                        @update="handleUpdate" />
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SMTP & Auth -->
            <div class="col-12 col-lg-4">
                <div class="card h-100 bg-body-tertiary border-secondary shadow-sm">
                    <div class="card-header bg-transparent border-secondary fw-bold">
                        <font-awesome-icon :icon="['fas', 'envelope']" class="me-2 text-success" />
                        SMTP Mail
                    </div>
                    <div class="card-body">
                        <ul class="list-group list-group-flush bg-transparent">
                            <ConfigItem label="Host" :value="config.smtp.host" icon="building" />
                            <ConfigItem label="Port" :value="config.smtp.port" icon="hashtag" type="number" />
                            <ConfigItem label="Secure" :value="config.smtp.secure" type="boolean"
                                icon="shield-halved" />
                            <!-- User had weird wrapping, editable helps alignment -->
                            <ConfigItem label="User" :value="config.smtp.auth.user" updateKey="config.smtp.auth.user"
                                @update="handleUpdate" />
                            <ConfigItem label="Password" :value="config.smtp.auth.pass" icon="lock" is-sensitive />
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Security Tokens -->
            <div class="col-12 col-lg-4">
                <div class="card h-100 bg-body-tertiary border-secondary shadow-sm">
                    <div class="card-header bg-transparent border-secondary fw-bold">
                        <font-awesome-icon :icon="['fas', 'user-shield']" class="me-2 text-secondary" />
                        Security & Access
                    </div>
                    <div class="card-body">
                        <ul class="list-group list-group-flush bg-transparent">
                            <ConfigItem label="Public API Token" :value="config.system.PUBLIC_API_AUTH_TOKEN"
                                updateKey="config.system.PUBLIC_API_AUTH_TOKEN" is-sensitive :editable="true"
                                @update="handleUpdate" />
                            <ConfigItem label="Scraper Token" :value="config.scraper.authToken" is-sensitive
                                updateKey="config.scraper.authToken" :editable="true" @update="handleUpdate" />
                            <ConfigItem label="Subsystem Token" :value="config.subsystem.authToken" is-sensitive
                                updateKey="config.subsystem.authToken" :editable="true" @update="handleUpdate" />
                            <div class="list-group-item bg-transparent text-secondary border-0 pt-3">
                                <small class="text-muted fst-italic">Tokens hidden for security</small>
                            </div>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Registration Settings -->
            <div class="col-12 col-lg-4">
                <div class="card h-100 bg-body-tertiary border-secondary shadow-sm">
                    <div class="card-header bg-transparent border-secondary fw-bold">
                        <font-awesome-icon :icon="['fas', 'user-plus']" class="me-2 text-primary" />
                        Registration
                    </div>
                    <div class="card-body">
                        <ul class="list-group list-group-flush bg-transparent">
                            <ConfigItem label="Enabled" :value="config.registration.enabled" type="boolean"
                                updateKey="config.registration.enabled" icon="toggle-on" :editable="true"
                                @update="handleUpdate" />
                            <ConfigItem label="Token" :value="config.registration.token"
                                updateKey="config.registration.token" is-sensitive :editable="true"
                                @update="handleUpdate" />
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Proxy APIs -->
            <div class="col-12">
                <div class="card bg-body-tertiary border-secondary shadow-sm">
                    <div class="card-header bg-transparent border-secondary fw-bold">
                        <font-awesome-icon :icon="['fas', 'share-nodes']" class="me-2 text-info" />
                        Proxy APIs
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6 class="text-uppercase text-muted fs-7 mb-3">Segment API</h6>
                                <ul class="list-group list-group-flush bg-transparent">
                                    <ConfigItem label="Tracking URL" :value="config.proxyAPIs.segmentapi.url"
                                        updateKey="config.proxyAPIs.segmentapi.url" icon="chart-line" :editable="true"
                                        @update="handleUpdate" />
                                </ul>
                            </div>
                            <div class="col-md-6">
                                <h6 class="text-uppercase text-muted fs-7 mb-3">AniDB API</h6>
                                <ul class="list-group list-group-flush bg-transparent">
                                    <ConfigItem label="API URL" :value="config.proxyAPIs.anidbapi.url" icon="tv"
                                        updateKey="config.proxyAPIs.anidbapi.url" :editable="true"
                                        @update="handleUpdate" />
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<script lang="ts" setup>
import { h, defineComponent, resolveComponent } from 'vue';

definePageMeta({
    middleware: 'auth',
});

// --- Mock Store Logic ---
const adminStore = useAdminStore();

const loading = computed(() => adminStore.loading || false);
const error = computed(() => adminStore.error || null);
const config = computed(() => adminStore.config);

// Dummy Update Handler
const handleUpdate = (key: string, value: any) => {
    console.log(`Updating ${key} to:`, value);
    // In a real app, you would dispatch to the store here:
    // await adminStore.updateConfig({ [key]: value });
    alert(`Value updated to: ${value}`);
};

// --- ConfigItem Component (Render Function) ---
const ConfigItem = defineComponent({
    props: {
        label: String,
        value: { type: [String, Number, Boolean] as PropType<string | number | boolean>, required: true },
        updateKey: String,
        icon: String,
        isSensitive: Boolean,
        editable: Boolean,
        type: String as PropType<'text' | 'number' | 'boolean' | 'password'>
    },
    emits: ['update'],
    setup(props, { emit }) {
        const isEditing = ref(false);
        const localValue = ref(props.value);
        const isVisible = ref(!props.isSensitive);

        // Ensure localValue syncs if prop changes externally
        watch(() => props.value, (newVal) => {
            localValue.value = newVal;
            if (!isEditing.value) isVisible.value = !props.isSensitive;
        });

        const displayValue = computed(() => {
            if (props.isSensitive && !isVisible.value) return '••••••••••••';
            return props.value;
        });

        const toggleVisibility = () => {
            if (props.isSensitive) isVisible.value = !isVisible.value;
        };

        const startEdit = () => {
            isEditing.value = true;
            // If it's a boolean, we don't really toggle visibility before editing, we just flip it
            if (props.type === 'boolean' || typeof props.value === 'boolean') {
                // No specific action needed, checkbox handles it
            }
        };

        const cancelEdit = () => {
            isEditing.value = false;
            localValue.value = props.value; // Reset
        };

        const saveEdit = () => {
            isEditing.value = false;
            emit('update', props.updateKey, localValue.value);
        };

        const handleBooleanToggle = () => {
            localValue.value = !localValue.value;
            saveEdit(); // Auto-save boolean toggles
        };

        const FaIcon = resolveComponent('font-awesome-icon');

        return () => {
            const isBoolean = props.type === 'boolean' || typeof props.value === 'boolean';

            // --- Right Side Content (Value, Input, Buttons) ---
            let rightContent;

            if (isEditing.value && !isBoolean) {
                // EDIT MODE: Text/Number Input
                rightContent = [
                    h('input', {
                        type: props.type === 'number' ? 'number' : 'text',
                        value: localValue.value,
                        onInput: (e: any) => localValue.value = e.target.value,
                        class: 'form-control form-control-sm bg-dark text-white border-secondary me-2',
                        // IMPORTANT: Use object style instead of string to avoid CSSStyleDeclaration error
                        style: { maxWidth: '300px', minWidth: '150px' },
                        onClick: (e: Event) => e.stopPropagation()
                    }),
                    // Save Button
                    h('button', {
                        onClick: saveEdit,
                        class: 'btn btn-sm btn-link text-success p-0 me-1',
                        title: 'Save'
                    }, [h(FaIcon, { icon: ['fas', 'check'] })]),
                    // Cancel Button
                    h('button', {
                        onClick: cancelEdit,
                        class: 'btn btn-sm btn-link text-danger p-0',
                        title: 'Cancel'
                    }, [h(FaIcon, { icon: ['fas', 'xmark'] })])
                ];
            } else if (isEditing.value && isBoolean) {
                // EDIT MODE: Boolean (Checkbox)
                rightContent = [
                    h('div', { class: 'form-check form-switch' }, [
                        h('input', {
                            class: 'form-check-input',
                            type: 'checkbox',
                            checked: localValue.value,
                            onChange: handleBooleanToggle
                        })
                    ])
                ];
            } else {
                // VIEW MODE: Display Value
                const valueDisplay = isBoolean
                    ? h('span', { class: `badge ${props.value ? 'bg-success' : 'bg-danger'} me-2` }, props.value ? 'Enabled' : 'Disabled')
                    : h('span', {
                        class: 'config-value text-white',
                        onClick: props.editable ? startEdit : undefined,
                        // IMPORTANT: Use object style
                        style: props.editable ? { cursor: 'pointer' } : {}
                    }, displayValue.value);

                // Right Side Actions (Eye, Edit)
                const actions = [
                    props.isSensitive
                        ? h('button', {
                            onClick: (e: Event) => { e.stopPropagation(); toggleVisibility(); },
                            class: 'btn btn-sm btn-link text-secondary p-0 ms-2',
                            // IMPORTANT: Use object style
                            style: { fontSize: '0.8rem' },
                            title: isVisible.value ? 'Hide' : 'Show'
                        }, [h(FaIcon, { icon: ['fas', isVisible.value ? 'eye-slash' : 'eye'] })])
                        : null,

                    props.editable && !isBoolean
                        ? h('button', {
                            onClick: startEdit,
                            class: 'btn btn-sm btn-link text-secondary p-0 ms-2',
                            // IMPORTANT: Use object style
                            style: { fontSize: '0.8rem', opacity: '0.5', transition: 'opacity 0.2s' },
                            title: 'Edit',
                            onMouseover: (e: any) => e.target.style.opacity = '1',
                            onMouseout: (e: any) => e.target.style.opacity = '0.5',
                        }, [h(FaIcon, { icon: ['fas', 'pen-to-square'] })])
                        : null
                ];

                rightContent = [valueDisplay, ...actions];
            }

            // --- Full Row Render ---
            return h('li', {
                class: 'list-group-item bg-transparent d-flex justify-content-between align-items-center px-0 py-2',
                // IMPORTANT: Use object style
                style: (props.editable && !isEditing.value && !props.isSensitive) ? { cursor: 'pointer' } : undefined,
                onClick: (props.editable && !isEditing.value && !props.isSensitive) ? startEdit : undefined
            }, [
                // Left Side: Icon + Label
                h('div', { class: 'd-flex align-items-center', style: { minWidth: '120px' } }, [
                    props.icon ? h(FaIcon, {
                        icon: ['fas', props.icon],
                        class: 'me-3 text-secondary',
                        fixedWidth: true,
                        // IMPORTANT: Use object style
                        style: { width: '20px' }
                    }) : null,
                    h('span', { class: 'text-muted' }, props.label)
                ]),

                // Right Side: Value + Controls
                h('div', { class: 'd-flex align-items-center justify-content-end flex-grow-1' }, rightContent)
            ]);
        };
    }
});
</script>

<style scoped>
.card-header {
    letter-spacing: 0.5px;
}

.list-group-item {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: background-color 0.2s;
}

.list-group-item:hover {
    background-color: rgba(255, 255, 255, 0.02);
}

.list-group-item:last-child {
    border-bottom: none;
}

/* Improved text handling to prevent weird wrapping */
.config-value {
    /* Only breaks words if they are too long, not mid-sentence */
    word-break: break-word;
    text-align: right;
    /* Ensure it doesn't overflow flex container */
    overflow-wrap: break-word;
    max-width: 100%;
}

/* Ensure inputs in edit mode are dark to match theme */
input[type="text"],
input[type="number"] {
    background-color: #212529 !important;
    border-color: #495057 !important;
    color: #fff !important;
}
</style>