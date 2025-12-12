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