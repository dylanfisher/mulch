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

import { ArrowLineRightIcon } from "@phosphor-icons/react/ArrowLineRight";
import { ArrowUUpLeftIcon } from "@phosphor-icons/react/ArrowUUpLeft";
import { ArrowUUpRightIcon } from "@phosphor-icons/react/ArrowUUpRight";
import { CameraIcon } from "@phosphor-icons/react/Camera";
import { CaretUpIcon } from "@phosphor-icons/react/CaretUp";
import { CropIcon } from "@phosphor-icons/react/Crop";
import { DotsSixVerticalIcon } from "@phosphor-icons/react/DotsSixVertical";
import { DownloadSimpleIcon } from "@phosphor-icons/react/DownloadSimple";
import { FileTextIcon } from "@phosphor-icons/react/FileText";
import { MagnetIcon } from "@phosphor-icons/react/Magnet";
import { PauseIcon } from "@phosphor-icons/react/Pause";
import { PlayIcon } from "@phosphor-icons/react/Play";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { PowerIcon } from "@phosphor-icons/react/Power";
import { RepeatIcon } from "@phosphor-icons/react/Repeat";
import { StopIcon } from "@phosphor-icons/react/Stop";
import { TrashIcon } from "@phosphor-icons/react/Trash";
import { UploadSimpleIcon } from "@phosphor-icons/react/UploadSimple";
import { WaveformIcon } from "@phosphor-icons/react/Waveform";
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
  // One grip, not two arrows: reordering is a drag of the card, and the arrow keys on that
  // same grip are its keyboard path (0062).
  reorder: DotsSixVerticalIcon,
  add: PlusIcon,
  remove: TrashIcon,
  capture: CameraIcon,
  // One picture for the fold, not two: the toggle reports which way it is pointing through
  // `aria-pressed`, and the caret turns with it (0055).
  collapse: CaretUpIcon,
  apply: ArrowLineRightIcon,
  undo: ArrowUUpLeftIcon,
  redo: ArrowUUpRightIcon,
  exportSession: DownloadSimpleIcon,
  exportLog: FileTextIcon,
  // Not the session's download arrow: what leaves here is the sound, and the two entries sit one
  // above the other in the same menu, where one picture twice says they do the same thing.
  exportAudio: WaveformIcon,
  openSession: UploadSimpleIcon,
} as const satisfies Record<string, typeof PlayIcon>;
