import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { getProjectsDir, getProjectDir, ensureDir } from './data-path'

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  language: 'zh' | 'en' | 'zh-en-mixed'
  originalSrtPath: string
  extractedTextPath: string
  correctedTextPath: string
  finalSrtPath: string
  knowledgeBaseFiles: string[]
  status: 'imported' | 'extracted' | 'correcting' | 'corrected' | 'merged' | 'exported'
}

function projectYamlPath(projectId: string): string {
  return path.join(getProjectDir(projectId), 'project.yaml')
}

function readProjectYaml(projectId: string): Project {
  const yamlPath = projectYamlPath(projectId)
  const content = fs.readFileSync(yamlPath, 'utf-8')
  return yaml.load(content) as Project
}

function writeProjectYaml(project: Project): void {
  const dir = getProjectDir(project.id)
  ensureDir(dir)
  const yamlPath = path.join(dir, 'project.yaml')
  fs.writeFileSync(yamlPath, yaml.dump(project, { lineWidth: -1 }), 'utf-8')
}

/** Generate a project ID from name and date */
function generateId(name: string): string {
  const date = new Date().toISOString().slice(0, 10)
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `${date}-${slug}`
}

/** List all projects, sorted by date descending */
export function listProjects(): Project[] {
  const projectsDir = getProjectsDir()
  if (!fs.existsSync(projectsDir)) return []

  const dirs = fs.readdirSync(projectsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  const projects: Project[] = []
  for (const dir of dirs) {
    const yamlPath = path.join(projectsDir, dir, 'project.yaml')
    if (fs.existsSync(yamlPath)) {
      try {
        const project = yaml.load(fs.readFileSync(yamlPath, 'utf-8')) as Project
        projects.push(project)
      } catch { /* skip malformed */ }
    }
  }

  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** Create a new project */
export function createProject(name: string, language: Project['language']): Project {
  const id = generateId(name)
  const now = new Date().toISOString()
  const project: Project = {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    language,
    originalSrtPath: '',
    extractedTextPath: '',
    correctedTextPath: '',
    finalSrtPath: '',
    knowledgeBaseFiles: [],
    status: 'imported',
  }

  // Create project directory and subdirectories
  const dir = getProjectDir(id)
  ensureDir(dir)
  ensureDir(path.join(dir, 'kb'))

  writeProjectYaml(project)
  return project
}

/** Get a project by ID */
export function getProject(id: string): Project {
  return readProjectYaml(id)
}

/** Update a project */
export function updateProject(id: string, data: Partial<Project>): Project {
  const project = readProjectYaml(id)
  Object.assign(project, data, { updatedAt: new Date().toISOString() })
  writeProjectYaml(project)
  return project
}

/** Delete a project and its directory */
export function deleteProject(id: string): void {
  const dir = getProjectDir(id)
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}
