import type { ImmutableObject } from 'jimu-core'

export interface Config {
  [key: string]: never
}

export type IMConfig = ImmutableObject<Config>
