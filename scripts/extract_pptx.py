import sys,os,json
from xml.etree import ElementTree as ET
base=sys.argv[1]
A='{http://schemas.openxmlformats.org/drawingml/2006/main}'
P='{http://schemas.openxmlformats.org/presentationml/2006/main}'
R='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
pres=ET.parse(f'{base}/ppt/presentation.xml').getroot()
rels=ET.parse(f'{base}/ppt/_rels/presentation.xml.rels').getroot()
rmap={r.get('Id'):r.get('Target') for r in rels}
order=[rmap[s.get(R+'id')] for s in pres.find(P+'sldIdLst')]
def ptext(para):
    return ''.join(x.text or '' for x in para.iter(A+'t')).strip()
def pinfo(para):
    ppr=para.find(A+'pPr'); lvl=int(ppr.get('lvl',0)) if ppr is not None else 0
    bold=any(r.find(A+'rPr') is not None and r.find(A+'rPr').get('b')=='1' for r in para.findall(A+'r'))
    return lvl,bold
out=[]
for i,t in enumerate(order,1):
    root=ET.parse(f'{base}/ppt/{t}').getroot()
    blocks=[]
    tree=root.find(P+'cSld').find(P+'spTree')
    def walk(node):
        for ch in node:
            tag=ch.tag.split('}')[1]
            if tag=='grpSp': walk(ch)
            elif tag=='sp':
                nv=ch.find(P+'nvSpPr/'+P+'nvPr/'+P+'ph')
                ph=nv.get('type') if nv is not None else None
                tb=ch.find(P+'txBody')
                if tb is None: continue
                items=[]
                for para in tb.findall(A+'p'):
                    tx=ptext(para)
                    if tx:
                        l,b=pinfo(para); items.append([l,int(b),tx])
                if items: blocks.append({'k':'title' if ph in('title','ctrTitle') else 'text','items':items})
            elif tag=='graphicFrame':
                tbl=ch.find('.//'+A+'tbl')
                if tbl is not None:
                    rows=[[ '\n'.join(ptext(p) for p in tc.iter(A+'p') if ptext(p)) for tc in tr.findall(A+'tc')] for tr in tbl.findall(A+'tr')]
                    blocks.append({'k':'table','rows':rows})
                else:
                    # smartart etc
                    blocks.append({'k':'graphic'})
    walk(tree)
    rp=f'{base}/ppt/slides/_rels/'+os.path.basename(t)+'.rels'
    imgs=[];dgm=[]
    if os.path.exists(rp):
        for r in ET.parse(rp).getroot():
            tg=r.get('Target')
            if 'media' in tg: imgs.append(os.path.basename(tg))
            if 'diagram' in tg and 'data' in tg: dgm.append(os.path.basename(tg))
    out.append({'n':i,'blocks':blocks,'imgs':imgs,'dgm':dgm})
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False)
