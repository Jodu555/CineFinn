export function roleIDToName(id: number) {
  switch (id) {
    case 1:
      return 'User';
    case 2:
      return 'Moderator';
    case 3:
      return 'Administrator';
    default:
      return 'Unknown Role';
  }
}

export const validateEmail = (email: string) => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};