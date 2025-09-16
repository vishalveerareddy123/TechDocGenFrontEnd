import React, { Component, createRef } from 'react';
import RecordRTC from 'recordrtc';
import {
  Box, Grid, Paper, Button, Typography, LinearProgress,
  CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Alert
} from '@mui/material';
import Markdown from './Markdown';

class UploadForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isRecording: false,
      recordedChunks: [],
      videoPreviewUrl: '',
      uploadProgress: 0,
      showPermissionDialog: false,
      permissionGranted: false,
      isLoading: false,
      error: '',
      markdown: '',
      elapsedSec: 0,
      selectedFile: null
    };
    this.videoRef = createRef();
    this.stream = null;
    this.recorder = null;
    this.autoStopTimer = null;
    this.tickTimer = null;
  }

  // ---------- UI helpers ----------
  formatTime = (sec) => {
    const d = new Date(sec * 1000).toISOString();
    return d.substring(11, 19);
  };

  // ---------- Permissions flow ----------
  requestPermissions = () => {
    this.setState({ showPermissionDialog: true });
  };

  handleCloseDialog = (grant) => {
    this.setState({ showPermissionDialog: false });
    if (grant) this.startRecording();
  };

  // ---------- Recording ----------
  startRecording = async () => {
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30, cursor: 'always' }, audio: false });

      // merge video + mic
      const stream = new MediaStream([
        ...screen.getVideoTracks(),
        ...mic.getAudioTracks()
      ]);
      this.stream = stream;

      // live preview
      if (this.videoRef.current) {
        this.videoRef.current.srcObject = stream;
        this.videoRef.current.muted = true;
        try { await this.videoRef.current.play(); } catch {}
      }

      // configure recorder
      this.setState({ recordedChunks: [], permissionGranted: true, elapsedSec: 0, videoPreviewUrl: '', markdown: '' });
      this.recorder = new RecordRTC(stream, {
        type: 'video',
        mimeType: 'video/webm',
        timeSlice: 5000,
        ondataavailable: (blob) => {
          this.setState(prev => ({ recordedChunks: [...prev.recordedChunks, blob] }));
        }
      });

      this.recorder.startRecording();
      this.setState({ isRecording: true });

      // timers
      if (this.tickTimer) clearInterval(this.tickTimer);
      this.tickTimer = setInterval(() => this.setState(s => ({ elapsedSec: s.elapsedSec + 1 })), 1000);
      this.autoStopTimer = setTimeout(() => this.stopRecording(), 30 * 60 * 1000);

      // stop when user ends the share
      screen.getTracks().forEach(t => (t.onended = () => this.stopRecording()));
    } catch (error) {
      console.error(error);
      alert('Permissions denied or error occurred. Please allow mic and screen.');
      this.setState({ permissionGranted: false });
    }
  };

  stopRecording = () => {
    if (!this.recorder) return;
    this.recorder.stopRecording(() => {
      clearTimeout(this.autoStopTimer);
      clearInterval(this.tickTimer);
      this.tickTimer = null;

      const mergedBlob = new Blob(this.state.recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(mergedBlob);

      // detach live stream
      if (this.videoRef.current) {
        try { this.videoRef.current.pause(); } catch {}
        this.videoRef.current.srcObject = null;
      }
      // stop tracks
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
      }

      this.setState({
        videoPreviewUrl: url,
        isRecording: false
      });
    });
  };

  // ---------- Upload / Generate ----------
  handleGenerate = async () => {
    const { recordedChunks, selectedFile } = this.state;
    let payloadFile = null;

    if (selectedFile) {
      payloadFile = selectedFile;
    } else if (recordedChunks.length) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      payloadFile = new File([blob], 'recorded-video.webm', { type: 'video/webm' });
    } else {
      this.setState({ error: 'Record or upload a video first.' });
      return;
    }

    await this.handleUpload(payloadFile);
  };

  handleUpload = async (file) => {
    this.setState({ isLoading: true, error: '', markdown: '' });
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await fetch('https://techdocgen-68ur.onrender.com/upload-video', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(600000)
      });
      if (!response.ok) throw new Error('Server error');
      const data = await response.json();
      this.setState({ markdown: data.generated_documentation || '' });
    } catch (err) {
      const msg = err?.name === 'AbortError' ? 'Upload timed out' : `Upload failed: ${err?.message || 'Unknown error'}`;
      this.setState({ error: msg });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  // ---------- File picker ----------
  onPickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      this.setState({ error: 'Please select a video file.' });
      return;
    }
    if (this.state.videoPreviewUrl) URL.revokeObjectURL(this.state.videoPreviewUrl);
    const url = URL.createObjectURL(file);
    this.setState({ selectedFile: file, videoPreviewUrl: url, recordedChunks: [], error: '' });
  };

  // ---------- Cleanup ----------
  componentWillUnmount() {
    if (this.state.videoPreviewUrl) URL.revokeObjectURL(this.state.videoPreviewUrl);
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.autoStopTimer) clearTimeout(this.autoStopTimer);
  }

  render() {
    const { isLoading, error, markdown, isRecording, videoPreviewUrl, recordedChunks, showPermissionDialog, elapsedSec } = this.state;
    const canGenerate = !!videoPreviewUrl || recordedChunks.length > 0;

    const recordingPct = isRecording ? ((elapsedSec % 60) / 60) * 100 : 0;

    return (
      <Box sx={{ maxWidth: 1120, mx: 'auto', p: 3 }}>
        <Typography variant="h4" sx={{ mb: 0.5 }}>Record Your Demo</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Record  your product demo to get started.
        </Typography>

        <Grid container spacing={3}>
          {/* Left column */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1.5 }}>Record</Typography>
              <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                <Button variant="contained" color="info" onClick={this.requestPermissions} disabled={isRecording || isLoading}>
                  Start Recording
                </Button>
                <Button variant="contained" color="error" onClick={this.stopRecording} disabled={!isRecording || isLoading}>
                  Stop Recording
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {isRecording ? 'Recording...' : 'Idle'} {this.formatTime(elapsedSec)}
              </Typography>
              <LinearProgress variant="determinate" value={recordingPct} />
            </Paper>

           
          </Grid>

          {/* Right column */}
          <Grid item xs={12} md={6}>
           {videoPreviewUrl && <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1.5 }}>Video Preview</Typography>
              <Box sx={{ position: 'relative', borderRadius: 1.5, overflow: 'hidden', bgcolor: 'grey.200', aspectRatio: '16 / 9' }}>
                <video ref={this.videoRef} src={videoPreviewUrl || undefined} controls playsInline style={{ width: '100%', height: '100%', background: '#111' }} />
              </Box>
            </Paper>}

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Documentation</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Once your video is ready, generate the documentation.
              </Typography>
              <Button variant="contained" disabled={!canGenerate || isLoading} onClick={this.handleGenerate}>
                {isLoading ? 'Generating…' : 'Generate Documentation'}
              </Button>
            </Paper>
          </Grid>
        </Grid>

        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Processing…</Typography>
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {markdown && <Box sx={{ mt: 3 }}><Markdown markdown={markdown} /></Box>}

        {/* Permission dialog */}
        <Dialog open={showPermissionDialog} onClose={() => this.handleCloseDialog(false)}>
          <DialogTitle>Grant Permissions</DialogTitle>
          <DialogContent>
            <DialogContentText>
              To record your screen and audio, grant microphone access and select the screen or window to share.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => this.handleCloseDialog(false)} color="secondary">Cancel</Button>
            <Button onClick={() => this.handleCloseDialog(true)} color="primary">Proceed</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
}

export default UploadForm;
