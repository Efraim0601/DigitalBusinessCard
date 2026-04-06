import {
  createError,
  defineEventHandler,
  deleteCookie,
  getCookie,
  getQuery,
  getRouterParam,
  readBody,
  setCookie,
  setResponseHeader,
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
  setResponseHeader,
  setResponseStatus,
});
