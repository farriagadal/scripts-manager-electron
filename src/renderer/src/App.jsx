import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

const INTERPRETERS = [
  { value: 'python', label: 'Python', color: '#3b82f6', ext: '.py' },
  { value: 'python3', label: 'Python 3', color: '#3b82f6', ext: '.py' },
  { value: 'node', label: 'Node.js', color: '#22c55e', ext: '.js' },
  { value: 'bash', label: 'Bash', color: '#a855f7', ext: '.sh' },
  { value: 'powershell', label: 'PowerShell', color: '#5b85f6', ext: '.ps1' },
  { value: 'cmd', label: 'CMD', color: '#78716c', ext: '.bat' },
]

function getInterpreter(value) {
  return INTERPRETERS.find((i) => i.value === value) || { label: value, color: '#8b949e' }
}

function Badge({ interpreter }) {
  const info = getInterpreter(interpreter)
  return (
    <span className="badge" style={{ background: info.color + '22', color: info.color, border: `1px solid ${info.color}44` }}>
      {info.label}
    </span>
  )
}

const EMPTY_FORM = { name: '', path: '', interpreter: 'python', args: '', cwd: '' }

function ScriptForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const browsePath = async () => {
    const p = await window.api.selectFile()
    if (p) setForm((f) => ({ ...f, path: p }))
  }

  const browseCwd = async () => {
    const p = await window.api.selectFolder()
    if (p) setForm((f) => ({ ...f, cwd: p }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.path.trim()) return
    onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initial?.id ? 'Edit Script' : 'Add Script'}</h2>
          <button className="icon-btn" onClick={onCancel}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Name *</label>
            <input value={form.name} onChange={set('name')} placeholder="My Script" required />
          </div>
          <div className="form-group">
            <label>Script Path *</label>
            <div className="input-row">
              <input value={form.path} onChange={set('path')} placeholder="C:\scripts\my_script.py" required />
              <button type="button" className="btn-secondary" onClick={browsePath}>Browse</button>
            </div>
          </div>
          <div className="form-group">
            <label>Interpreter</label>
            <select value={form.interpreter} onChange={set('interpreter')}>
              {INTERPRETERS.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Arguments <span className="hint">(optional)</span></label>
            <input value={form.args} onChange={set('args')} placeholder="--verbose --output result.txt" />
          </div>
          <div className="form-group">
            <label>Working Directory <span className="hint">(optional)</span></label>
            <div className="input-row">
              <input value={form.cwd} onChange={set('cwd')} placeholder="Default: script directory" />
              <button type="button" className="btn-secondary" onClick={browseCwd}>Browse</button>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LogPanel({ logs, isRunning, onClear }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleCopy = () => {
    const text = logs.map((l) => l.text).join('')
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="log-panel">
      <div className="log-header">
        <span className="log-title">
          <span className={`status-dot ${isRunning ? 'running' : logs.length > 0 ? 'done' : 'idle'}`} />
          Output
        </span>
        <div className="log-actions">
          {logs.length > 0 && (
            <>
              <button className="btn-ghost" onClick={handleCopy}>Copy</button>
              <button className="btn-ghost" onClick={onClear}>Clear</button>
            </>
          )}
        </div>
      </div>
      <div className="log-body">
        {logs.length === 0 ? (
          <p className="log-empty">Output will appear here when you run a script.</p>
        ) : (
          logs.map((entry, i) => (
            <span key={i} className={`log-line log-${entry.type}`}>
              {entry.text}
            </span>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">📋</div>
      <h3>No script selected</h3>
      <p>Select a script from the sidebar or add a new one to get started.</p>
      <button className="btn-primary" onClick={onAdd}>+ Add your first script</button>
    </div>
  )
}

export default function App() {
  const [scripts, setScripts] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingScript, setEditingScript] = useState(null)
  const [search, setSearch] = useState('')

  const selected = scripts.find((s) => s.id === selectedId) || null

  // Load scripts on mount
  useEffect(() => {
    window.api.getScripts().then(setScripts)
  }, [])

  // Subscribe to script output events
  useEffect(() => {
    const offOutput = window.api.onOutput((data) => {
      setLogs((prev) => [...prev, data])
    })
    const offDone = window.api.onDone(() => {
      setIsRunning(false)
    })
    return () => {
      offOutput()
      offDone()
    }
  }, [])

  const persistScripts = useCallback((updated) => {
    setScripts(updated)
    window.api.saveScripts(updated)
  }, [])

  const handleSave = (form) => {
    let updated
    if (editingScript?.id) {
      updated = scripts.map((s) => (s.id === editingScript.id ? { ...form, id: s.id } : s))
    } else {
      const newScript = { ...form, id: crypto.randomUUID() }
      updated = [...scripts, newScript]
      setSelectedId(newScript.id)
    }
    persistScripts(updated)
    setShowForm(false)
    setEditingScript(null)
  }

  const handleDelete = (id) => {
    if (!confirm('Delete this script?')) return
    const updated = scripts.filter((s) => s.id !== id)
    persistScripts(updated)
    if (selectedId === id) setSelectedId(null)
  }

  const handleEdit = (script) => {
    setEditingScript(script)
    setShowForm(true)
  }

  const handleRun = async () => {
    if (!selected || isRunning) return
    setLogs([])
    setIsRunning(true)
    const result = await window.api.runScript(selected)
    if (!result.ok) {
      setLogs([{ type: 'stderr', text: `[Error: ${result.error}]\n` }])
      setIsRunning(false)
    }
  }

  const handleStop = async () => {
    await window.api.stopScript()
    setIsRunning(false)
  }

  const filtered = scripts.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="app-logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">Scripts</span>
          </div>
          <button
            className="btn-add"
            onClick={() => { setEditingScript(null); setShowForm(true) }}
            title="Add script"
          >
            +
          </button>
        </div>

        <div className="search-box">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scripts..."
            className="search-input"
          />
        </div>

        <div className="script-list">
          {filtered.length === 0 && (
            <p className="list-empty">
              {search ? 'No matches.' : 'No scripts yet.'}
            </p>
          )}
          {filtered.map((script) => (
            <div
              key={script.id}
              className={`script-item ${selectedId === script.id ? 'selected' : ''}`}
              onClick={() => setSelectedId(script.id)}
            >
              <div className="script-item-info">
                <span className="script-item-name">{script.name}</span>
                <Badge interpreter={script.interpreter} />
              </div>
              <div className="script-item-actions">
                <button
                  className="icon-btn-sm"
                  onClick={(e) => { e.stopPropagation(); handleEdit(script) }}
                  title="Edit"
                >✎</button>
                <button
                  className="icon-btn-sm danger"
                  onClick={(e) => { e.stopPropagation(); handleDelete(script.id) }}
                  title="Delete"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {!selected ? (
          <EmptyState onAdd={() => { setEditingScript(null); setShowForm(true) }} />
        ) : (
          <>
            {/* Script detail card */}
            <div className="detail-card">
              <div className="detail-header">
                <div>
                  <h1 className="detail-name">{selected.name}</h1>
                  <div className="detail-meta">
                    <Badge interpreter={selected.interpreter} />
                    <span className="detail-path">{selected.path}</span>
                  </div>
                </div>
                <div className="detail-controls">
                  <button className="icon-btn" onClick={() => handleEdit(selected)} title="Edit">✎</button>
                  {!isRunning ? (
                    <button className="btn-run" onClick={handleRun}>
                      ▶ Run
                    </button>
                  ) : (
                    <button className="btn-stop" onClick={handleStop}>
                      ■ Stop
                    </button>
                  )}
                </div>
              </div>

              {(selected.args || selected.cwd) && (
                <div className="detail-extras">
                  {selected.args && (
                    <div className="detail-field">
                      <span className="field-label">Args:</span>
                      <code className="field-value">{selected.args}</code>
                    </div>
                  )}
                  {selected.cwd && (
                    <div className="detail-field">
                      <span className="field-label">CWD:</span>
                      <code className="field-value">{selected.cwd}</code>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Log panel */}
            <LogPanel
              logs={logs}
              isRunning={isRunning}
              onClear={() => setLogs([])}
            />
          </>
        )}
      </main>

      {/* Form modal */}
      {showForm && (
        <ScriptForm
          initial={editingScript}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingScript(null) }}
        />
      )}
    </div>
  )
}
