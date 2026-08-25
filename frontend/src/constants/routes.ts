export const ROUTES = {
  home: '/',
  tours: '/tours',
  tourDetail: (slug: string) => `/tours/${slug}`,
  category: (slug: string) => `/categories/${slug}`,
  search: '/search',
  about: '/about',
  contact: '/contact',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',

  account: '/account',
  cart: '/cart',

  admin: '/admin',
} as const
