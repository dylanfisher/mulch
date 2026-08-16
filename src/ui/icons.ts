/**
 * @role The instrument's icon vocabulary: one icon per action, decided once here and imported
 *   wherever that action is offered, so play means the same picture on a deck, in the rack and in
 *   the menubar. Icons come per icon rather than through the barrel, so a screen pulls only the
 *   ones it draws.
 * @instead Anything that is not an action — an effect, a theme — carries its icon beside its own
 *   identity, never as a second map from ids to pictures here.
 */

// One import per action this file names, which is the entire point of it: the count tracks how
// many actions the instrument offers, not how much this file decides, and the per-icon paths are
// what keep a screen from pulling the barrel.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies

import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import { ArrowLineRightIcon } from "@phosphor-icons/react/ArrowLineRight";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { ArrowUUpLeftIcon } from "@phosphor-icons/react/ArrowUUpLeft";
import { ArrowUUpRightIcon } from "@phosphor-icons/react/ArrowUUpRight";
import { CameraIcon } from "@phosphor-icons/react/Camera";
import { CropIcon } from "@phosphor-icons/react/Crop";
import { DownloadSimpleIcon } from "@phosphor-icons/react/DownloadSimple";
import { MagnetIcon } from "@phosphor-icons/react/Magnet";
import { PauseIcon } from "@phosphor-icons/react/Pause";
import { PlayIcon } from "@phosphor-icons/react/Play";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { PowerIcon } from "@phosphor-icons/react/Power";
import { RepeatIcon } from "@phosphor-icons/react/Repeat";
import { StopIcon } from "@phosphor-icons/react/Stop";
import { TrashIcon } from "@phosphor-icons/react/Trash";
import { UploadSimpleIcon } from "@phosphor-icons/react/UploadSimple";
// oxlint-enable import/max-dependencies

/**
 * Keyed by what the control does, not by where it sits: `remove` is the same picture on a deck,
 * a clip and a rack instance because those are one action a person learns once. A key that would
 * only ever have one call site still belongs here — the point is that the next surface offering
 * that action finds the answer rather than choosing again.
 */
export const ACTION_ICONS = {
  play: PlayIcon,
  pause: PauseIcon,
  stop: StopIcon,
  loop: RepeatIcon,
  crop: CropIcon,
  snap: MagnetIcon,
  bypass: PowerIcon,
  earlier: ArrowLeftIcon,
  later: ArrowRightIcon,
  add: PlusIcon,
  remove: TrashIcon,
  capture: CameraIcon,
  apply: ArrowLineRightIcon,
  undo: ArrowUUpLeftIcon,
  redo: ArrowUUpRightIcon,
  exportSession: DownloadSimpleIcon,
  openSession: UploadSimpleIcon,
} as const satisfies Record<string, typeof PlayIcon>;
