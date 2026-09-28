import * as vscode from "vscode";
import { ALL_KEY, LOCAL_KEY, UNTAGGED_KEY } from "../model/grouping";

export function groupLabel(key: string): string {
  if (key === ALL_KEY) {
    return "";
  }
  if (key === UNTAGGED_KEY) {
    return vscode.l10n.t("Untagged");
  }
  if (key === LOCAL_KEY) {
    return vscode.l10n.t("Local");
  }
  return key;
}
