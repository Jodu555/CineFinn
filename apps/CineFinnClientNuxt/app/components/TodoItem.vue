<template>
    <div>
        <li class="list-group-item">
            <div class="d-flex">
                <img v-if="decideImageURL(minimal, element).length > 0" :src="decideImageURL(minimal, element)"
                    class="img-fluid rounded-top me-4 dp-img" alt="" />
                <div style="width: 100%" ref="parent">
                    <div class="d-flex justify-content-between">
                        <div>
                            {{ element.name }} -
                            {{ element.categorie }}
                            <span class="badge bg-primary mx-2 me-3">{{ element.order }}</span>
                            <button v-if="authStore.user.role >= 2 && !element.edited" title="Edit" type="button"
                                @click="element.edited = true" class="btn btn-outline-primary me-3">
                                <font-awesome-icon :icon="['fa-solid', 'fa-pen']" size="lg" />
                            </button>
                            <button v-if="authStore.user.role >= 2 && !element.edited" title="Use" type="button"
                                @click="todoStore.useTodo(element.ID)" class="btn btn-outline-success me-3">
                                <font-awesome-icon :icon="['fa-solid', 'fa-check']" size="lg" />
                            </button>
                            <button v-if="authStore.user.role >= 2 && !element.edited" title="Delete" type="button"
                                @click="todoStore.deleteTodo(element.ID)" class="btn btn-outline-danger">
                                <font-awesome-icon :icon="['fa-solid', 'fa-trash']" size="lg" />
                            </button>
                        </div>
                        <div>
                            <!-- Bring to Top -->
                            <button
                                v-if="authStore.user.role >= 2 && !element.edited && element.order > 6 && authStore.user.role > 2"
                                title="Bring to top" @click="todoStore.moveToDoToTop(element.ID)" type="button"
                                class="btn btn-outline-info me-2">
                                <font-awesome-icon icon="fa-solid fa-up-long" />
                            </button>
                            <!-- Bring to Bottom -->
                            <button
                                v-if="authStore.user.role >= 2 && !element.edited && element.order <= listLength / 1.2"
                                title="Bring to Bottom" @click="todoStore.moveToDoToBottom(element.ID)" type="button"
                                class="btn btn-outline-warning">
                                <font-awesome-icon icon="fa-solid fa-down-long" />
                            </button>
                            <button v-if="element.edited" type="button" @click="element.edited = false"
                                class="btn btn-close"></button>
                        </div>
                    </div>
                    <!-- <h5>Infos</h5> -->

                    <!-- Creator -->
                    <span v-if="permittedAccounts.find((x) => x.UUID == element.creator) != null">- {{
                        permittedAccounts.find((x) => x.UUID == element.creator)?.username}}</span>

                    <!-- References -->
                    <div v-if="authStore.user.role > 2" style="width: 15%" class="d-flex justify-content-around">
                        <a v-if="element.references.aniworld" target="_blank" :href="element.references.aniworld"
                            class="h6">A</a>
                        <a v-if="element.references.sto" target="_blank" :href="element.references.sto" class="h6">S</a>
                        <!-- <span v-if="element.references.zoro" class="h6">Z</span>
                        <a v-if="element.references.anix" target="_blank" :href="element.references.anix"
                            class="h6">AX</a>
                        <a v-if="element.references.myasiantv" target="_blank" :href="element.references.myasiantv"
                            class="h6">M</a> -->
                    </div>

                    <!-- Language Devision Listing Episodes / Movies -->
                    <ul v-if="!minimal && languageDevisionC.total != -1">
                        <li>Episodes: {{ languageDevisionC.total }}</li>
                        <li>
                            &nbsp;&nbsp;&nbsp;&nbsp;Apx Size on Disk:
                            {{ numWithFP((languageDevisionC.total * constants.mbperEpisode) / 1024, 1)
                            }}GB
                        </li>
                        <li v-for="[key, value] in Object.entries(languageDevisionC.devision)">
                            &nbsp;&nbsp;&nbsp;&nbsp;{{ key }}: {{ value }}%
                        </li>
                        <template v-if="hasMovies">
                            <li>Movies: {{ element.scrapingInfo?.['aniworld']?.data?.movies?.length ||
                                element.scrapingInfo?.['sto']?.data?.movies?.length || 0 }}</li>
                            <li>
                                &nbsp;&nbsp;&nbsp;&nbsp;Apx Size on Disk:
                                {{ numWithFP(((element.scrapingInfo?.['aniworld']?.data?.movies?.length ||
                                    element.scrapingInfo?.['sto']?.data?.movies?.length || 0) * constants.mbperMovie) /
                                    1024, 1)
                                }}GB
                            </li>
                        </template>
                        <div v-if="authStore.user.role > 1">
                            <em>
                                <!-- <div>
                                            Source:
                                            <template v-if="element.scraped !== undefined && element.scraped !== true">
                                                <br />
                                                <a target="_blank" :href="element.scraped?.url">{{ element.scraped?.url
                                                    }}</a>
                                            </template>
                                            <template
                                                v-if="element.scrapedZoro !== undefined && element.scrapedZoro !== true">
                                                <br />
                                                <a target="_blank" :href="element.scrapedZoro.episodes[0]?.url">{{
                                                    element.scrapedZoro.episodes[0]?.url
                                                    }}</a>
                                            </template>
                                            <template
                                                v-if="element.scrapednewZoro !== undefined && element.scrapednewZoro !== true">
                                                <br />
                                                <a target="_blank"
                                                    :href="element.scrapednewZoro.seasons[0]?.[0]?.url">{{
                                                        element.scrapednewZoro.seasons[0]?.[0]?.url
                                                    }}</a>
                                            </template>
                                            <template
                                                v-if="element.scrapedAnix !== undefined && element.scrapedAnix !== true">
                                                <br />
                                                <a target="_blank"
                                                    :href="`https://anix.to/anime/${element.references.anix}`">{{
                                                        `https://anix.to/anime/${element.references.anix}`
                                                    }}</a>
                                            </template>
                                            <template
                                                v-if="element.scrapedMyasiantv !== undefined && element.scrapedMyasiantv !== true">
                                                <br />
                                                <a target="_blank" :href="element.scrapedMyasiantv.url">{{
                                                    element.scrapedMyasiantv.url }}</a>
                                            </template>
                                        </div> -->
                                <br />
                                <p v-if="authStore.user.role > 1" style="cursor: pointer"
                                    @click="todoStore.deleteOrRetryScrapeTodo(element.ID, 'all')">
                                    <u>Delete All Scraped infos</u>
                                </p>
                            </em>
                        </div>
                    </ul>

                    <!-- Scrape Infos Per ScraperKey -->
                    <div v-for="[key, scrapeInfo] in Object.entries(element.scrapingInfo! || {})">
                        <div v-if="scrapeInfo != undefined">
                            <p class="mb-0" style="text-transform: capitalize;">{{ key }}: {{ new
                                Date(scrapeInfo.scrapedAt).toLocaleString() }}
                                ({{
                                    scrapeInfo.message }})</p>
                            <div v-if="scrapeInfo?.state === 'loading'" class="m-3 d-flex justify-content-between">
                                <div class="spinner-border text-warning spinner-border-xs" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <small class="text-danger" style="cursor: pointer"
                                    @click="todoStore.deleteOrRetryScrapeTodo(element.ID, scrapeInfo.key)"><u>Retry {{
                                        scrapeInfo.key
                                        }}</u></small>
                            </div>

                            <span v-if="scrapeInfo?.state === 'error'" class="h6 text-danger mb-0">
                                <span>!!! {{ scrapeInfo.message }} !!! &nbsp;&nbsp;&nbsp;&nbsp;
                                    <small style="cursor: pointer"
                                        @click="todoStore.deleteOrRetryScrapeTodo(element.ID, scrapeInfo.key)">
                                        <u>Retry {{ scrapeInfo.key }}</u>
                                    </small>
                                </span>
                            </span>

                            <span v-if="scrapeInfo?.state === 'success'" class="h6 text-success mt-0">
                                <span>Success: "{{ scrapeInfo.message }}" &nbsp;&nbsp;&nbsp;&nbsp;
                                    <small class="text-secondary" style="cursor: pointer"
                                        @click="todoStore.deleteOrRetryScrapeTodo(element.ID, scrapeInfo.key)">
                                        <u>Rescrape {{ scrapeInfo.key }}</u>
                                    </small>
                                </span>
                            </span>
                        </div>
                        <div v-else>
                            This should not happen
                        </div>
                    </div>

                    <!-- Editing Todo -->
                    <div v-if="element.edited">
                        <h5>Infos</h5>
                        <div>
                            <div class="row text-center mt-2 mb-2 align-items-center">
                                <div class="col-2">
                                    <label for="name" class="form-label">Name:</label>
                                </div>
                                <div class="col-7">
                                    <!-- <InputValidator v-model="form.password" v-model:valid="form.passwordValid"
										type="password" id="password" name="Password" autocomplete="current-password"
										placeholder="Enter Password" :rules="rules.passwordRules" /> -->
                                    <input-validator v-model="element.name" v-model:valid="todoNameValid" type="text"
                                        :disabled="authStore.user.UUID != element.creator && authStore.user.role == 2"
                                        id="name" name="Name" autocomplete="todo-name" placeholder="Enter Name"
                                        :rules="todoNameRules" :show-label="false" />
                                    <!-- <input type="text"
                                        :disabled="authStore.user.UUID != element.creator && authStore.user.role == 2"
                                        class="form-control" id="name" v-model="element.name" /> -->
                                </div>
                            </div>
                            <template v-if="authStore.user.role == 2">
                                <div class="row text-center mt-2 mb-2 align-items-center">
                                    <div class="col-2">
                                        <label for="name" class="form-label">Creator:</label>
                                    </div>
                                    <div class="col-1 h5">
                                        <span>{{permittedAccounts.find((x) => x.UUID ==
                                            element.creator)?.username}}</span>
                                    </div>
                                </div>
                            </template>
                            <template v-else>
                                <div class="row text-center mt-2 mb-2 align-items-center">
                                    <div class="col-2">
                                        <label for="name" class="form-label">Creator:</label>
                                    </div>
                                    <div class="col-3">
                                        <select v-model="element.creator" style="width: 100%" class="form-select"
                                            aria-label="Default select example">
                                            <option selected disabled>From</option>
                                            <option v-for="account in permittedAccounts" :value="account.UUID">
                                                {{ account.username }}
                                            </option>
                                        </select>
                                    </div>
                                </div>
                            </template>
                            <div class="row text-center mt-2 mb-2 align-items-center">
                                <div class="col-2">
                                    <label for="name" class="form-label">Kategorie:</label>
                                </div>
                                <div class="col-3">
                                    <select v-model="element.categorie" style="width: 100%"
                                        :disabled="authStore.user.UUID != element.creator && authStore.user.role == 2"
                                        class="form-select" aria-label="Default select example">
                                        <option selected disabled>Kategorie</option>
                                        <option>Aniworld</option>
                                        <option>STO</option>
                                        <option>K-Drama</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <hr />
                        <h5>References</h5>
                        <div v-if="false">
                            <h6>Anime</h6>
                            <div class="row text-center align-items-center mb-4">
                                <div class="col-2">
                                    <label for="url" class="form-label">Aniworld:</label>
                                </div>
                                <div class="col-7">
                                    <input-validator v-model="element.references.aniworld" v-model:valid="aniworldValid"
                                        type="text" id="url" name="AniworldRef" autocomplete="aniworld-reference"
                                        placeholder="Enter URL"
                                        :disabled="authStore.user.UUID != element.creator && authStore.user.role == 2"
                                        :show-label="false" :rules="aniworldRules" :can-be-empty="true" />
                                    <!-- <input type="text"
                                        :disabled="authStore.user.UUID != element.creator && authStore.user.role == 2"
                                        class="form-control" id="url" v-model="element.references.aniworld" /> -->
                                </div>
                            </div>
                            <!-- <div class="row text-center align-items-center mb-4">
                                <div class="col-2">
                                    <label for="url" class="form-label">Zoro:</label>
                                </div>
                                <div class="col-7">
                                    <input type="text"
                                        :disabled="authStore.user.UUID != element.creator && authStore.user.role == 2"
                                        class="form-control" id="url" v-model="element.references.zoro" />
                                </div>
                            </div>
                            <div class="row text-center align-items-center">
                                <div class="col-2">
                                    <label for="url" class="form-label">Anix:</label>
                                </div>
                                <div class="col-7">
                                    <input type="text"
                                        :disabled="authStore.user.UUID != element.creator && authStore.user.role == 2"
                                        class="form-control" id="url" v-model="element.references.anix" />
                                </div>
                            </div> -->
                            <hr />
                            <h6>STO</h6>
                            <div class="row text-center align-items-center mb-4">
                                <div class="col-2">
                                    <label for="url" class="form-label">STO:</label>
                                </div>
                                <div class="col-7">
                                    <input-validator v-model="element.references.sto" v-model:valid="stoValid"
                                        type="text" id="url" name="STORef" autocomplete="sto-reference"
                                        placeholder="Enter URL"
                                        :disabled="authStore.user.UUID != element.creator && authStore.user.role == 2"
                                        :show-label="false" :rules="stoRules" :can-be-empty="true" />
                                    <!-- <input type="text"
                                        :disabled="authStore.user.UUID != element.creator && authStore.user.role == 2"
                                        class="form-control" id="url" v-model="element.references.sto" /> -->
                                </div>
                            </div>
                            <!-- <hr /> -->
                            <!-- <h6>K-Drama</h6> -->
                            <!-- <div class="row text-center align-items-center mb-4">
                                <div class="col-2">
                                    <label for="url" class="form-label">MyAsianTV:</label>
                                </div>
                                <div class="col-7">
                                    <input type="text"
                                        :disabled="authStore.user.UUID != element.creator && authStore.user.role == 2"
                                        class="form-control" id="url" v-model="element.references.myasiantv" />
                                </div>
                            </div> -->
                        </div>
                        <div>
                            <div v-for="refCategorie in categories">
                                <h6>{{ refCategorie }}</h6>

                                <div v-for="refkey in Object.keys(element.references).filter(x => scrapers.find(y => y.referenceKey == x)?.categorie == refCategorie)"
                                    class="row text-center align-items-center mb-4">
                                    <div class="col-2">
                                        <label for="url" class="form-label" style="text-transform: capitalize;">{{
                                            refkey }}:</label>
                                    </div>
                                    <div class="col-7">
                                        <input-validator v-model="element.references[refkey as keyof TodoReferences]"
                                            v-model:valid="valid[refkey as keyof TodoReferences]" type="text" id="url"
                                            :name="'ref-' + refkey" :autocomplete="'ref' + refkey"
                                            placeholder="Enter URL"
                                            :disabled="authStore.user.UUID != element.creator && authStore.user.role == 2"
                                            :show-label="false" :rules="rules[refkey as keyof TodoReferences]"
                                            :can-be-empty="true" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="d-flex justify-content-end">
                            <button type="button" @click="element.edited = false"
                                class="btn btn-outline-danger mx-2">Cancel
                            </button>
                            <button type="button" @click="
                                element.edited = false;
                            todoStore.saveTodo();
                            " class="btn btn-outline-success">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="mt-2 d-flex justify-content-end">
                <small>- {{ element.ID }}</small>
            </div>
        </li>
    </div>
</template>

<script lang="ts" setup>
import type { TodoItem, TodoReferences } from '@cinefinn/types/database';
import InputValidator from './InputValidator.vue';


const props = withDefaults(defineProps<{
    element: TodoItem;
    minimal: boolean;
    permittedAccounts: permAcc[];
    listLength: number;
    drag: boolean;
}>(), {
    minimal: false,
    listLength: 0,
});

const authStore = useAuthStore();
const todoStore = useTodoStore();

const [parent, enable] = useAutoAnimate();

watch(() => props.drag, (val) => {
    enable(!val);
});

const hasMovies = computed(() => {

    if (props.element.scrapingInfo == undefined)
        return false;

    if (props.element.scrapingInfo['aniworld'] != undefined && props.element.scrapingInfo['aniworld'].state === 'success') {
        return props.element.scrapingInfo['aniworld'].data!.hasMovies;
    }

    if (props.element.scrapingInfo['sto'] != undefined && props.element.scrapingInfo['sto'].state === 'success') {
        return props.element.scrapingInfo['sto'].data!.hasMovies;
    }

});

const todoNameValid = ref(false);

const todoNameRules = [
    (v: string) => !!v || 'Name is required',
    (v: string) => v.length <= 64 || 'Name must be less than 64 characters',
    (v: string) => /^[-\w^&'@{}[\],$=!#().%+~ ]+$/.test(v) || 'Name must adhere to Windows File/Folder naming Standards',
    (v: string) => v.at(-1) != ' ' || 'Name must not end with a space',
];

const categories = computed(() => {
    const out = new Set<string>();
    Object.keys(props.element.references).forEach(key => {
        out.add(scrapers.find(s => s.scrapeKey == key)?.categorie || '');
    });
    return [...out];
});

const valid = reactive<Record<keyof TodoReferences, boolean>>({} as Record<keyof TodoReferences, boolean>);
const rules = reactive<Record<keyof TodoReferences, ((v: string) => string | true)[]>>({} as Record<keyof TodoReferences, ((v: string) => string | true)[]>);


Object.keys(props.element.references).forEach(key => {
    valid[key as keyof TodoReferences] = false;
    rules[key as keyof TodoReferences] = scrapers.find(s => s.scrapeKey == key)?.inputValidationRules || [];
});


const aniworldValid = ref(false);
const aniworldRules = [
    (v: string) => /^https?:\/\/aniworld\.to\/anime\/stream\/[a-zA-Z0-9\-]+\/?$/.test(v) || 'URL must be a valid Aniworld URL',
    (v: string) => !v.includes('/filme') || 'URL must be a valid Aniworld URL and cannot be a movie page',
    (v: string) => !v.includes('/staffel') || 'URL must be a valid Aniworld URL and cannot be an episode page',
]

const stoValid = ref(false);
const stoRules = [
    (v: string) => (/^https?:\/\/sto\.to\/anime\/stream\/[a-zA-Z0-9\-]+\/?$/.test(v) || /^http?:\/\/186\.2\.175\.5\/serie\/stream\/[a-zA-Z0-9\-]+\/?$/.test(v)) || 'URL must be a valid STO URL',
    (v: string) => !v.includes('/filme') || 'URL must be a valid STO URL and cannot be a movie page',
    (v: string) => !v.includes('/staffel') || 'URL must be a valid STO URL and cannot be an episode page',
]

const languageDevisionC = computed(() => languageDevision(props.element));

const numWithFP = (num: string | number, pts: number): number => {
    if (typeof num == 'number') num = String(num);
    return parseFloat(parseFloat(num).toFixed(pts));
};

const constants = reactive({
    mbperEpisode: 350,
    mbperMovie: 2048,
});

</script>

<style scoped>
.dp-img {
    /* max-width: 18rem;
    min-width: 17rem;
    min-height: 24rem;
    max-height: 20rem; */
    max-width: 15rem;
    min-width: 14rem;
    min-height: 20rem;
    max-height: 22rem;
    width: 100%;
    object-fit: cover;
    border-radius: 25px;
}
</style>