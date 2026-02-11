import { library, config } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {
    faPen, faCheck, faTrash, faDownLong, faRightFromBracket, faGears, faEdit, faForwardStep, faBackwardStep, faBackward, faForward,
    faPlus, faArrowLeft, faTv, faList, faGrip, faPlay, faPause, faLanguage, faHeart, faChevronRight,
    faEye, faUserPlus, faToggleOn, faShareNodes, faChartLine, faUserShield, faLock, faAt, faShieldHalved, faHashtag,
    faBuilding, faEnvelope, faKey, faPlug, faServer, faBolt, faUser, faTable, faDatabase, faImage, faFilm, faGlobe, faCodeBranch, faSliders, faNetworkWired,
    faEyeSlash, faXmark, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { faClock, faCalendar } from '@fortawesome/free-regular-svg-icons';

config.autoAddCss = false;

library.add(
    faPen, faCheck, faTrash, faDownLong, faRightFromBracket, faGears, faEdit, faForwardStep, faBackwardStep, faBackward, faForward,
    faPlus, faArrowLeft, faTv, faList, faGrip, faPlay, faPause, faLanguage, faHeart, faChevronRight,
    faEye, faUserPlus, faToggleOn, faShareNodes, faChartLine, faUserShield, faLock, faAt, faShieldHalved, faHashtag,
    faBuilding, faEnvelope, faKey, faPlug, faServer, faBolt, faUser, faTable, faDatabase, faImage, faFilm, faGlobe, faCodeBranch, faSliders, faNetworkWired,
    faEyeSlash, faXmark, faExclamationTriangle
);
library.add(faClock, faCalendar);

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.component('font-awesome-icon', FontAwesomeIcon);
});