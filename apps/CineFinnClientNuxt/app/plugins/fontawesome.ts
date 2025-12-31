import { library, config } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {
    faPen, faCheck, faTrash, faDownLong, faRightFromBracket, faGears, faEdit,
    faPlus, faArrowLeft, faTv, faList, faGrip, faPlay, faLanguage, faHeart, faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { faClock, faCalendar } from '@fortawesome/free-regular-svg-icons';

config.autoAddCss = false;

library.add(faPen, faCheck, faTrash, faDownLong, faRightFromBracket, faGears, faEdit, faPlus, faArrowLeft, faTv, faList, faGrip, faPlay, faLanguage, faHeart, faChevronRight);
library.add(faClock, faCalendar);

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.component('font-awesome-icon', FontAwesomeIcon);
});