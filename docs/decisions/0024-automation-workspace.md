# 0024. Automation targets follow the rack, and every edit is one whole lane

- **Date:** 2026-08-14
- **Status:** accepted

Automation targets are derived from the current rack (`automationTargets(effects)`), never a maintained list; a removed effect's lane is retained but unscheduled until the effect returns; and every lane edit — freehand draw or Option-hold knob recording — commits as one whole-lane `automation.set` per gesture.
