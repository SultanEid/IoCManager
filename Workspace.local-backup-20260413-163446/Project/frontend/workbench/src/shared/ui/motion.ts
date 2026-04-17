import type { Transition, Variants } from "framer-motion"

export const motionTransition: Transition = {
  duration: 0.26,
  ease: [0.16, 1, 0.3, 1],
}

export const pageMotion: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: motionTransition,
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { ...motionTransition, duration: 0.18 },
  },
}

export const staggerMotion: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
}

export const panelMotion: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: motionTransition },
}
