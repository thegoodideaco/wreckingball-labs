import gsap from 'gsap'

import * as THREE from 'three'
import * as vue from 'vue'
import RAPIER from '@dimforge/rapier3d'
import * as vueUse from '@vueuse/core'
import { usePane } from '@/composables/usePane'

import * as tsl from 'three/tsl'

import * as THREE_ADDONS from 'three/addons'

import * as THREE_GPU from 'three/webgpu'
import { useTicker } from './composables/useTicker'

import * as physics from '@/modules/physics'

function htmlTableToMarkdown(tableInput: string | HTMLTableElement): string {
  // Accept either HTML string or DOM element
  let table
  if (typeof tableInput === 'string') {
    const parser = new DOMParser()
    const doc = parser.parseFromString(tableInput, 'text/html')
    table = doc.querySelector('table')
    if (!table) throw new Error('No table found in HTML string')
  } else {
    table = tableInput
  }

  const rows = Array.from(table.rows)
  if (rows.length === 0) return ''

  const getText = (cell: HTMLElement) => cell.textContent!.trim().replace(/\|/g, '\\|')

  const headers = Array.from(rows[0]!.cells).map(getText)
  const aligns = headers.map(() => '---') // Could be improved for actual alignment detection

  const markdown = [
    `| ${headers.join(' | ')} |`,
    `| ${aligns.join(' | ')} |`,
    ...rows.slice(1).map((row) => {
      const cells = Array.from(row.cells).map(getText)
      return `| ${cells.join(' | ')} |`
    }),
  ]

  return markdown.join('\n')
}

export default {
  useTicker,
  THREE,
  THREE_GPU,
  THREE_ADDONS,
  gsap: gsap,
  vue,
  vueUse,
  usePane,
  tsl,
  htmlTableToMarkdown,
  RAPIER,
  physics,
}
