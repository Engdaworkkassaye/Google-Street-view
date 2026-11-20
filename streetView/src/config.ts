

import type { ImmutableObject } from 'jimu-core'

export interface Config {
  widgetTitle?: string
  centerMapOnClick?: boolean
}

export type IMConfig = ImmutableObject<Config>
