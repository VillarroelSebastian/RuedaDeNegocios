let currentUser: any = null;

export const userStore = {
  set: (user: any) => { currentUser = user; },
  get: () => currentUser,
  clear: () => { currentUser = null; },
};

export const API_URL = 'http://10.0.2.2:3334';
