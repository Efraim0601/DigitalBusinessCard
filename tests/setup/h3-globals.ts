import {
  createError,
  defineEventHandler,
  deleteCookie,
  getCookie,
  getQuery,
  getRouterParam,
  readBody,
  setCookie,
  setResponseStatus,
} from "h3";

Object.assign(globalThis, {
  createError,
  defineEventHandler,
  deleteCookie,
  getCookie,
  getQuery,
  getRouterParam,
  readBody,
  setCookie,
  setResponseStatus,
});
