import { ref, remove, update } from "firebase/database";

import { getFirebaseDb } from "@/services/firebase";
import { toSafeUidDotOnly, validateEmailForFirebase } from "@/utils/userKey";

type FavoriteLinkInput = {
  title: string;
  url: string;
};

function getFavoriteLinkPath(email: string, storageKey: string) {
  const validEmail = validateEmailForFirebase(email);
  if (!storageKey || /[.#$\[\]\/]/.test(storageKey)) {
    throw new Error("favorite_links 항목 키가 유효하지 않습니다.");
  }
  return `users/${toSafeUidDotOnly(validEmail)}/favorite_links/${storageKey}`;
}

export async function updateFavoriteLink(email: string, storageKey: string, link: FavoriteLinkInput) {
  const url = link.url.trim();
  if (!url) {
    throw new Error("URL을 입력해 주세요.");
  }
  const titleValue = link.title.trim();
  await update(ref(getFirebaseDb(), getFavoriteLinkPath(email, storageKey)), {
    title: titleValue,
    name: titleValue, // Keep name in sync with title for compatibility
    url,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteFavoriteLink(email: string, storageKey: string) {
  await remove(ref(getFirebaseDb(), getFavoriteLinkPath(email, storageKey)));
}
