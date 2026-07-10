import fitz, os

os.chdir(r'D:\HuaweiMoveData\Users\Huawei\Desktop\define')

for fname in ['结果1(2).pdf', '结果2(2).pdf']:
    doc = fitz.open(fname)
    print(f'=== {fname} ===')
    for i, page in enumerate(doc):
        text = page.get_text('text')
        if text.strip():
            print(f'--- Page {i+1} text ---')
            print(text[:2000])
            print()

        blocks = page.get_text('blocks')
        for b in blocks:
            txt = b[6].strip() if len(b) > 6 else ''
            if txt:
                print(f'  Block[{i+1}]: {txt[:500]}')

        # Check spans
        text_dict = page.get_text('dict')
        for block in text_dict.get('blocks', []):
            if 'lines' in block:
                for line in block['lines']:
                    for span in line['spans']:
                        stext = span.get('text', '').strip()
                        if stext:
                            print(f'  Span[{i+1}]: {stext[:200]}')
    doc.close()
    print()
    print('---END---')
    print()
