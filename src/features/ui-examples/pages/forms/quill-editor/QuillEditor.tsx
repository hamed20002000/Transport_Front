// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import { useTheme } from 'src/shared/components/compat';
import 'react-quill/dist/quill.snow.css';
import 'src/features/ui-examples/pages/forms/quill-editor/Quill.css';
import { Paper } from 'src/shared/components/compat';

import Breadcrumb from 'src/app/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/shared/components/container/PageContainer';
import ParentCard from 'src/shared/components/ParentCard';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Quill Editor',
  },
];

const QuillEditor = () => {
  const [text, setText] = useState('');

  const theme = useTheme();
  const borderColor = theme.palette.divider;

  return (
    <PageContainer title="Quill Editor" description="this is Quill Editor page">
      {/* breadcrumb */}
      <Breadcrumb title="Quill Editor" items={BCrumb} />
      {/* end breadcrumb */}
      <ParentCard title="Quill Editor">
        <Paper
          sx={{ border: `1px solid ${borderColor}` }}
          variant="outlined"
        >
          <ReactQuill
            value={text}
            onChange={(value) => {
              setText(value);
            }}
            placeholder="Type here..."
          />
        </Paper>
      </ParentCard>
    </PageContainer>
  );
};

export default QuillEditor;
