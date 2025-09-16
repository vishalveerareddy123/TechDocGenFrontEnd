import React, { useEffect, useMemo, useRef, useState } from 'react';
import UploadForm from './UploadForm';
import Markdown from './Markdown';
export default function App() {
  const [selectedMenuItem, setSelectedMenuItem] = useState('new-demo');
  return (
    <div style={styles.app}>
      <Sidebar selectedMenuItem={selectedMenuItem} setSelectedMenuItem={setSelectedMenuItem}/>
      {selectedMenuItem === 'record-video' ? <UploadForm />: <Main />}
    </div>
  );
}

function Sidebar(props) {
  const { selectedMenuItem, setSelectedMenuItem } = props;
  return (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        <div style={styles.brandIcon}></div>
        <div style={styles.brandText}>DemoDocs</div>
      </div>

      <nav style={styles.nav}>
        <NavItem active={selectedMenuItem === 'new-demo'} onClick={(e) => setSelectedMenuItem('new-demo')} label="New Demo" />
        <NavItem active={selectedMenuItem === 'record-video'} onClick={(e) => setSelectedMenuItem('record-video')} label="Record Video" />
      </nav>
    </aside>
  );
}

function NavItem({ label, active, onClick }) {
  return (
    <div
      style={{
        ...styles.navItem,
        background: active ? '#eef2ff' : 'transparent',
        color: active ? '#4338ca' : '#0f172a',
        borderColor: active ? '#c7d2fe' : 'transparent',
      }}
      onClick={onClick}
    >
      <span >{label}</span>
    </div>
  );
}

function Main() {
    const [file, setFile] = useState(null);
    const [markdown, setMarkdown] = useState('');
  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <h1 style={styles.title}>Generate Documentation</h1>
        <div style={styles.subtitle}>Create structured technical documentation from your video demos.</div>
      </header>

      <div style={styles.topRow}>
        <div style={styles.colLeft}>
          <UploadCard file={file} setFile={setFile} markdown={markdown} setMarkdown={setMarkdown}/>
        </div>
        {file?
        <div style={styles.colRight}>
          <PreviewCard file={file}/>
        
        </div>
        :null}
      </div>

      <div style={styles.bottomRow}>
        <div style={styles.colLeft}>
          <DocsCard markdown={markdown}/>
        </div>
        
      </div>
    </main>
  );
}

function UploadCard(props) {
    const {file, setFile, markdown, setMarkdown} = props;
  const [dragActive, setDragActive] = useState(false);

  const [progress, setProgress] = useState(0); // snapshot shows 0%
  const inputRef = useRef(null);

  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);

      handleUpload(f);
      simulateProgress();
    }
  };
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
        console.log(f);
      setFile(f);
     
      handleUpload(f);
      simulateProgress();
    }
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const simulateProgress = () => {
    
    let p = 0;
    const t = setInterval(() => {
      p = Math.min(99, p + Math.random() * 8);
      setProgress(Math.floor(p));
      if (p >= 99) clearInterval(t);
    }, 400);
  };
  const handleUpload = async (file) => {
    if (!file) return;


setMarkdown('');
setProgress(0);
    const formData = new FormData();
    formData.append('video', file);


    try {
      // Replace with your actual server endpoint
      const response = await fetch('https://techdocgen-68ur.onrender.com/upload-video', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(600000)
      });

      if (!response.ok) {
        throw new Error('Server error');
      }

      const data = await response.json();
      setMarkdown(data.generated_documentation); // Assuming server returns { markdown: '...' }
    } catch (err) {
      if (err.name === 'AbortError') {
        alert('Upload timed out');
      } else {
            alert('Upload failed: ' + err.detail);
      }
    } finally {
   
    }
  };
  return (
    <section style={styles.card}>
      <div style={styles.cardHeaderRow}>
        <h2 style={styles.cardTitle}>Upload Video</h2>
      </div>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload video"
        style={{
          ...styles.dropzone,
          borderColor: dragActive ? '#6366f1' : '#e5e7eb',
          background: dragActive ? '#f8fafc' : '#ffffff',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={onInputChange}
          style={{ display: 'none' }}
        />

        <UploadIllustration />
        <div style={{ marginTop: 12, fontSize: 14, color: '#475569' }}>
          <strong>Click to upload</strong> or drag and drop your video here.
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>MP4, MOV, WEBM (max 500MB)</div>
      </div>
{markdown.length==0 && progress>0 && progress<100 ?
      <div style={{ marginTop: 10 }}>
        <div style={styles.progressLabel}>Processing Video... {progress}%</div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
      </div>
   :null}
</section>
  );
}

function UploadIllustration() {
  return (
    <div style={styles.illustrationWrap}>
      <svg width="140" height="110" viewBox="0 0 160 120" aria-hidden="true">
        <rect x="0" y="0" width="160" height="120" rx="8" fill="#f1f5f9" />
        <rect x="30" y="22" width="100" height="60" rx="6" fill="#e2e8f0" stroke="#cbd5e1" />
        <polygon points="85,52 70,62 70,42" fill="none" stroke="#64748b" strokeWidth="3" />
        <rect x="40" y="90" width="80" height="6" rx="3" fill="#e2e8f0" />
      </svg>
    </div>
  );
}

function PreviewCard(props) {
  const {file} = props;
  const [fileUrl, setFileUrl] = useState('');
  
  // Expose a minimal bus for when Upload selects a file (optional hook-up point)
  useEffect(() => {
    if (!file) return;
    var blob = new Blob([file], { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    setFileUrl(
      url
    );
    const handler = (e) => {
      if (e.detail?.url) setFileUrl(e.detail.url);
    };
    window.addEventListener('preview:set', handler);
    return () => window.removeEventListener('preview:set', handler);
  }, []);

  return (
    <section style={styles.cardSmall}>
      <h3 style={styles.cardTitle}>Preview</h3>
      <div style={styles.previewBox}>
        {fileUrl ? (
          <video src={fileUrl} controls style={styles.previewVideo} />
        ) : (
          <div style={styles.previewPlaceholder}>
            <PlayIcon />
          </div>
        )}
      </div>
    </section>
  );
}



function DocsCard(props) {
  const {markdown} = props;
  const [activeTab, setActiveTab] = useState('Documentation');



  const tabs = ['Result'];


  return (
    <section style={styles.card}>
      <div style={styles.cardHeaderRow}>
        <h2 style={styles.cardTitle}>Result</h2>
       
      </div>
    {markdown ? <div>  <div style={styles.tabs}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              ...styles.tab,
              color: activeTab === t ? '#0f172a' : '#64748b',
              borderColor: activeTab === t ? '#e5e7eb' : 'transparent',
              background: activeTab === t ? '#ffffff' : 'transparent',
              fontWeight: activeTab === t ? 600 : 500,
            }}
          >
         
          </button>
        ))}
      </div>


      <div style={styles.fieldBlock}>
        <div style={styles.fieldLabel}></div>
        <Markdown markdown={markdown} />
      </div></div>:null}
    

     
    </section>
  );
}




function PlayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#0f172a" opacity="0.7" />
      <polygon points="10,8 16,12 10,16" fill="#ffffff" />
    </svg>
  );
}


/* Styles */
const styles = {
  app: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f8fafc',
    color: '#0f172a',
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
  },
  sidebar: {
    width: 220,
    borderRight: '1px solid #e5e7eb',
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    background: '#ffffff',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
  },
  brandIcon: { fontSize: 16 },
  brandText: { fontWeight: 700, fontSize: 14 },
  nav: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 },
  navSecondary: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 },
  navItem: {
    padding: '8px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    border: '1px solid transparent',
    fontSize: 14,
  },
  sidebarSpacer: { flex: 1 },

  main: { flex: 1, padding: '24px 28px' },
  header: { marginBottom: 16 },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  subtitle: { marginTop: 6, fontSize: 13, color: '#64748b' },

  topRow: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 },
  bottomRow: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginTop: 16 },
  colLeft: { minWidth: 0 },
  colRight: { display: 'flex', flexDirection: 'column', gap: 16 },

  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 16,
    boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
  },
  cardSmall: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 16,
    boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
  },
  cardHeaderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 600 },

  dropzone: {
    border: '2px dashed #e5e7eb',
    borderRadius: 10,
    padding: '26px 16px',
    textAlign: 'center',
    userSelect: 'none',
    cursor: 'pointer',
  },
  illustrationWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressLabel: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  progressBar: {
    width: '100%',
    height: 6,
    background: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #60a5fa, #2563eb)',
    width: '20%',
  },

  previewBox: {
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
    background: '#e2e8f0',
  },
  previewVideo: { width: '100%', display: 'block' },
  previewPlaceholder: {
    aspectRatio: '16 / 9',
    width: '100%',
    background:
      'linear-gradient(180deg, #dbeafe 0%, #e2e8f0 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '10px 12px',
    background: '#ffffff',
  },
  stepIcon: {
    width: 22,
    height: 22,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabs: {
    display: 'flex',
    gap: 12,
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 8,
    marginBottom: 12,
  },
  tab: {
    borderRadius: 8,
    border: '1px solid transparent',
    padding: '6px 10px',
    fontSize: 13,
    background: 'transparent',
    cursor: 'pointer',
  },

  fieldBlock: { marginTop: 8 },
  fieldLabel: { fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 },
  textarea: {
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
    outline: 'none',
    resize: 'vertical',
    background: '#ffffff',
  },

  settingsLabel: { fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 },
  selectWrap: { position: 'relative' },
  select: {
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '8px 32px 8px 10px',
    fontSize: 13,
    outline: 'none',
    background: '#ffffff',
    appearance: 'none',
    color: '#0f172a',
  },

  buttonSecondary: {
    border: '1px solid #e5e7eb',
    background: '#f8fafc',
    color: '#0f172a',
    padding: '6px 10px',
    fontSize: 13,
    borderRadius: 8,
    cursor: 'pointer',
  },
};
