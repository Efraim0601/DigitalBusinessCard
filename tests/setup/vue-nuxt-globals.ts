import {
  computed,
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
  withDefaults,
} from "vue";
import { useAppLocale } from "../../app/composables/useAppLocale";

function useStateStub<T>(_key: string, init: () => T) {
  return ref(init());
}

Object.assign(globalThis, {
  ref,
  computed,
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  watch,
  withDefaults,
  useState: useStateStub,
  useAppLocale,
});
