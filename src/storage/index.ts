import { Temporal } from "temporal-polyfill";
import { createEffect, createRoot, createSignal } from "solid-js";
import { getLocalValue, setLocalValue } from "./browser";

const cloudStorage = window?.chrome?.storage ? import("./extension") : null;

type BirthDay = Temporal.PlainDate | null;

const mapToBirthDay = (birthdayString: string | null): BirthDay => {
  if (birthdayString === null) {
    return null;
  }
  return Temporal.PlainDate.from(birthdayString);
};

const mapFromBirthDay = (birthday: BirthDay): string | null => {
  if (birthday === null) {
    return null;
  }
  return birthday.toJSON();
};

// eslint-disable-next-line import/no-unused-modules -- workaround for https://github.com/import-js/eslint-plugin-import/pull/2038
export const [getBirthDay, setBirthDay] = createSignal<BirthDay>(
  mapToBirthDay(getLocalValue()),
);

createRoot(() => {
  let initialRender = true;
  createEffect(() => {
    const value = getBirthDay();
    if (initialRender) {
      initialRender = false;
      return;
    }
    const birthdayString = mapFromBirthDay(value);
    setLocalValue(birthdayString);
    if (cloudStorage) {
      cloudStorage.then(({ setValue }) => {
        setValue(birthdayString);
      });
    }
  });
});

if (cloudStorage) {
  cloudStorage.then(({ getValue }) => {
    getValue((birthdayString) => {
      const currentBirthDayString = mapFromBirthDay(getBirthDay());
      if (birthdayString !== currentBirthDayString) {
        setBirthDay(mapToBirthDay(birthdayString));
      }
    });
  });
}

let INSTALL_DATE = (() => {
  const date = localStorage.getItem("install_date");
  if (date) {
    return Temporal.Instant.from(date);
  }
  const now = Temporal.Now.instant();
  window?.chrome?.storage?.sync?.set({
    install_date: now.toString(),
  });
  localStorage.setItem("install_date", now.toString());
  return now;
})();

window.chrome?.storage?.sync?.get(["install_date"], (result) => {
  const date = result.install_date;
  if (date) {
    INSTALL_DATE = Temporal.Instant.from(date);
  } else {
    window.chrome?.storage?.sync?.set({
      install_date: INSTALL_DATE.toString(),
    });
  }
});

let APP_REVIEWED = (() => {
  const appReviewed = localStorage.getItem("app_reviewed");
  return appReviewed === "true";
})();

window?.chrome?.storage?.sync?.get(["app_reviewed"], (result) => {
  const cloudAppReviewed = result.app_reviewed;
  if (cloudAppReviewed && !APP_REVIEWED) {
    APP_REVIEWED = true;
    localStorage.setItem("app_reviewed", "true");
  } else if (!cloudAppReviewed && APP_REVIEWED) {
    window?.chrome?.storage?.sync?.set({
      app_reviewed: true,
    });
  }
});

export const showRateApp = () => {
  if (APP_REVIEWED) {
    return false;
  }
  const installDate: Temporal.Instant = INSTALL_DATE;
  const now = Temporal.Now.instant();
  const diff = now.since(installDate);
  return diff.months >= 3;
};

export const setAppReviewed = () => {
  APP_REVIEWED = true;
  localStorage.setItem("app_reviewed", "true");
  window?.chrome?.storage?.sync?.set({
    app_reviewed: true,
  });
};
