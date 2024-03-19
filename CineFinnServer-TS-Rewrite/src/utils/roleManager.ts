import { Role, User } from '../types/session';
import { getAuthHelper } from './utils';

const isPermitted = (user: User, role: Role) => {
	// user.role = 1 = User
	// role = 2 = Mod

	return user.role >= role;
};

const roleAuthorization = (role: Role) => {
	return getAuthHelper().authenticationFull((user) => isPermitted(user, role));
};

export { isPermitted, roleAuthorization };
