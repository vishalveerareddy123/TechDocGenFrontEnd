import React from 'react';
import MuiMarkdown from 'mui-markdown';
import { Box, Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { saveAs } from 'file-saver';
export default class Markdown extends React.Component {
    constructor(props) {
        super(props);
       
    }

    handleDownload = (markdown) => {
        if (!markdown) return;
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        saveAs(blob, 'generated_documentation.md');
    };

    render() {
        const { markdown } = this.props;
        return (
            <div>
            <Box sx={{ width: '100%' }}>
             <MuiMarkdown>{markdown}</MuiMarkdown>
             <Button
               variant="outlined"
               startIcon={<DownloadIcon />}
               onClick={() => this.handleDownload(markdown)}
               sx={{ mt: 2 }}
             >
               Download 
             </Button>
            </Box>
            </div>
        );
    }
}