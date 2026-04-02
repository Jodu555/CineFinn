import { library, config } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {
    faPen, faCheck, faTrash, faDownLong, faRightFromBracket, faGears, faEdit, faForwardStep, faBackwardStep, faBackward, faForward,
    faPlus, faArrowLeft, faTv, faList, faGrip, faPlay, faPause, faLanguage, faHeart, faChevronRight, faStar, faFolder, faHandPointLeft,
    faEye, faUserPlus, faToggleOn, faShareNodes, faChartLine, faUserShield, faLock, faAt, faShieldHalved, faHashtag, faFileCode, faBomb,
    faBuilding, faEnvelope, faKey, faPlug, faServer, faBolt, faUser, faTable, faDatabase, faImage, faFilm, faGlobe, faCodeBranch, faSliders, faNetworkWired,
    faEyeSlash, faXmark, faExclamationTriangle, faChevronUp, faChevronDown, faCheckCircle, faTasks, faHistory, faSyncAlt, faHourglassHalf, faFileExport, faTerminal,
    faRightToBracket, faPaperPlane, faCircleInfo, faChevronLeft, faFire, faBookmark, faMinus, faTowerBroadcast, faBell, faArrowRotateLeft,
    faClock as fasClock, faUpLong,
} from '@fortawesome/free-solid-svg-icons';
import { faCalendar, faClock as farClock } from '@fortawesome/free-regular-svg-icons';

config.autoAddCss = false;

library.add(
    faPen, faCheck, faTrash, faDownLong, faRightFromBracket, faGears, faEdit, faForwardStep, faBackwardStep, faBackward, faForward, faFileExport, faTerminal,
    faPlus, faArrowLeft, faTv, faList, faGrip, faPlay, faPause, faLanguage, faHeart, faChevronRight, faChevronUp, faChevronDown, faTasks, faHistory,
    faEye, faUserPlus, faToggleOn, faShareNodes, faChartLine, faUserShield, faLock, faAt, faShieldHalved, faHashtag, faCheckCircle, faSyncAlt, faHourglassHalf,
    faBuilding, faEnvelope, faKey, faPlug, faServer, faBolt, faUser, faTable, faDatabase, faImage, faFilm, faGlobe, faCodeBranch, faSliders, faNetworkWired,
    faEyeSlash, faXmark, faExclamationTriangle, faStar, faFolder, faHandPointLeft, faFileCode, faBomb, faRightToBracket, faPaperPlane, faCircleInfo, faChevronLeft,
    faFire, faBookmark, faMinus, faTowerBroadcast, faBell, faArrowRotateLeft, fasClock, faUpLong
);
library.add(faCalendar, farClock);

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.component('font-awesome-icon', FontAwesomeIcon);
});