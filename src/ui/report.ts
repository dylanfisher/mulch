/**
 * @role The one way the interface says something did not go: a toast at the failure's own type,
 *   which takes itself away (0316). Its own module because three surfaces raise one — the File
 *   menu, the export dialog and a yard's own file drop — and the sentence must be spelled once.
 * @instead The sentence itself → `failedMessage` in src/lib/copy.ts. The manager and how long a
 *   toast stands → src/ui/components/toast.tsx and `TOAST_TIMEOUT_MS` in src/ui/App.tsx.
 */
import { failedMessage } from "@/lib/copy";
import { toast } from "@/ui/components/toast";

/**
 * One failure, said the one way anything is said in this app. `what` is the gesture in the words
 * its own control uses, so the toast names the thing a hand pressed rather than the module that
 * threw.
 */
export function reportFailure(what: string, reason: unknown): void {
  toast.add({ title: what, description: failedMessage(what, reason), type: "error" });
}
