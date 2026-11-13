import { useEffect } from 'react';

type Draft = {
  paths:Record<string,string>;
  texts:Record<string,string>;
  styles:Record<string,Record<string,string>>;
  hidden:string[];
  order:string[];
  added:Array<{id:string;kind:string;text:string}>;
};
const emptyDraft=():Draft=>({paths:{},texts:{},styles:{},hidden:[],order:[],added:[]});
const pageKey=()=> 'krishan.visual-editor.page.'+(window.location.pathname.replace(/\/+$/,'')||'home');

export const VisualEditorOverlay:React.FC<{enabled:boolean}> = ({enabled})=>{
  useEffect(()=>{
    if(!enabled) return;
    const storageKey=pageKey();
    const read=():Draft=>{try{return {...emptyDraft(),...JSON.parse(localStorage.getItem(storageKey)||'{}')};}catch{return emptyDraft();}};
    let draft=read();
    let selected:HTMLElement|null=null;
    let sectionContainer:HTMLElement|null=null;
    let editing=false;
    let suppressClick=false;
    const send=(type:string,payload:Record<string,unknown>={})=>window.parent.postMessage({source:'krishan-visual-editor',type,page:window.location.pathname,...payload},window.location.origin);
    const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(draft));send('vs:saved');}catch{send('vs:error',{message:'Browser draft storage is full.'});}};
    const getPath=(element:Element)=>{
      const parts:string[]=[];let node:Element|null=element;
      while(node&&node!==document.body){
        const tag=node.tagName.toLowerCase();
        const siblings=Array.from(node.parentElement?.children??[]).filter(item=>item.tagName===node!.tagName);
        parts.unshift(tag+':'+(siblings.indexOf(node)+1));
        node=node.parentElement;
      }
      return parts.join('/');
    };
    const assignKeys=()=>{
      const roots=Array.from(document.querySelectorAll('header,main,footer'));
      roots.forEach(root=>{
        [root,...Array.from(root.querySelectorAll('*'))].forEach(element=>{
          if(element.hasAttribute('data-vs-added')) return;
          if(!element.getAttribute('data-vs-key')){
            const path=getPath(element);
            const id=draft.paths[path]||'vs-'+Math.random().toString(36).slice(2,11);
            draft.paths[path]=id;element.setAttribute('data-vs-key',id);
          }
        });
      });
    };
    const getContainer=()=>{
      const main=document.querySelector('main') as HTMLElement|null;
      if(!main)return null;
      const first=main.firstElementChild as HTMLElement|null;
      return main.children.length===1&&first&&first.tagName==='DIV'?first:main;
    };
    const apply=()=>{
      assignKeys();
      for(const [key,value] of Object.entries(draft.texts)){
        const node=document.querySelector('[data-vs-key="'+CSS.escape(key)+'"]');
        if(node&&node.textContent!==value) node.textContent=value;
      }
      for(const [key,style] of Object.entries(draft.styles)){
        const node=document.querySelector('[data-vs-key="'+CSS.escape(key)+'"]') as HTMLElement|null;
        if(node)Object.entries(style).forEach(([name,value])=>{(node.style as any)[name]=value;});
      }
      draft.hidden.forEach(key=>{const node=document.querySelector('[data-vs-key="'+CSS.escape(key)+'"]') as HTMLElement|null;if(node)node.style.display='none';});
      const container=getContainer();
      if(container){
        sectionContainer=container;
        Array.from(container.children).forEach((child,index)=>{
          const node=child as HTMLElement;
          if(!node.getAttribute('data-vs-section-key')) node.setAttribute('data-vs-section-key',node.getAttribute('data-vs-key')||'vs-section-'+index);
        });
        if(draft.order.length){
          const children=Array.from(container.children) as HTMLElement[];
          const byKey=new Map(children.map(child=>[child.getAttribute('data-vs-section-key')||'',child]));
          draft.order.forEach(key=>{const node=byKey.get(key);if(node)container.appendChild(node);});
        }
        draft.added.forEach(item=>{
          if(document.querySelector('[data-vs-added="'+CSS.escape(item.id)+'"]'))return;
          const node=createBlock(item.kind,item.text);
          node.setAttribute('data-vs-added',item.id);
          node.setAttribute('data-vs-key',item.id);
          container.appendChild(node);
        });
      }
      document.documentElement.classList.add('krishan-visual-editing');
    };
    const createBlock=(kind:string,text:string):HTMLElement=>{
      let node:HTMLElement;
      if(kind==='heading'){node=document.createElement('h2');node.className='mx-auto my-6 max-w-5xl text-3xl font-extrabold text-[#12396f]';}
      else if(kind==='text'){node=document.createElement('p');node.className='mx-auto my-4 max-w-4xl text-base leading-7 text-slate-700';}
      else if(kind==='button'){node=document.createElement('a');node.href='#';node.className='my-4 inline-flex rounded-xl bg-[#0b3979] px-6 py-3 font-bold text-white';}
      else if(kind==='image'){node=document.createElement('div');node.className='my-6 grid min-h-48 place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500';node.textContent='Image block · Add media from Media Library';}
      else if(kind==='video'){node=document.createElement('div');node.className='my-6 grid min-h-48 place-items-center rounded-2xl bg-slate-950 text-white';node.textContent='Video block · Add media from Media Library';}
      else if(kind==='divider'){node=document.createElement('hr');node.className='my-8 border-slate-200';}
      else if(kind==='spacer'){node=document.createElement('div');node.className='my-4 h-10';node.setAttribute('aria-label','Vertical spacing');}
      else {node=document.createElement('div');node.className='my-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm';node.textContent=text||'New content card';}
      if(!['image','video','divider','spacer'].includes(kind))node.textContent=text;
      node.setAttribute('data-vs-new','true');node.setAttribute('draggable','true');
      return node;
    };
    const getSection=(target:HTMLElement):HTMLElement|null=>{
      const container=getContainer();
      if(!container)return null;
      let node:HTMLElement|null=target;
      while(node&&node.parentElement!==container)node=node.parentElement;
      return node?.parentElement===container?node:null;
    };
    const select=(target:HTMLElement)=>{
      const section=getSection(target);
      selected=target;sectionContainer=getContainer();
      document.querySelectorAll('[data-vs-selected="true"]').forEach(node=>node.removeAttribute('data-vs-selected'));
      target.setAttribute('data-vs-selected','true');
      if(section)section.setAttribute('data-vs-selected-section','true');
      const style=getComputedStyle(target);
      send('vs:select',{
        key:target.getAttribute('data-vs-key')||target.getAttribute('data-vs-added')||'',
        sectionKey:section?.getAttribute('data-vs-section-key')||'',
        tag:target.tagName.toLowerCase(),
        text:(target.textContent||'').trim().slice(0,2000),
        color:style.color,
        backgroundColor:style.backgroundColor,
        fontSize:parseFloat(style.fontSize)||16,
        textAlign:style.textAlign,
        pageTitle:document.title,
        sectionText:(section?.textContent||'').trim().slice(0,100)
      });
    };
    const onClick=(event:MouseEvent)=>{
      if(!editing)return;
      const target=event.target as HTMLElement|null;
      if(!target||target.closest('[data-vs-ui]'))return;
      const leaf=target.closest('h1,h2,h3,h4,h5,h6,p,li,a,button,label') as HTMLElement|null;
      const section=getSection(target);
      const chosen=leaf||section||target;
      if(chosen&&document.querySelector('main')?.contains(chosen)){
        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
        select(chosen);
      }
    };
    const onDoubleClick=(event:MouseEvent)=>{
      if(!editing)return;
      const target=event.target as HTMLElement|null;
      if(!target||target.closest('[data-vs-ui]'))return;
      const leaf=target.closest('h1,h2,h3,h4,h5,h6,p,li,a,button,label') as HTMLElement|null;
      if(!leaf||!document.querySelector('main')?.contains(leaf))return;
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      leaf.contentEditable='true';leaf.focus();leaf.dataset.vsEditing='true';
    };
    const onBlur=(event:FocusEvent)=>{
      const target=event.target as HTMLElement|null;
      if(!target?.dataset.vsEditing)return;
      target.contentEditable='false';delete target.dataset.vsEditing;
      const key=target.getAttribute('data-vs-key')||'';
      if(key)draft.texts[key]=target.textContent||'';
      persist();send('vs:select',{key,text:target.textContent||''});
    };
    let dragKey='';
    const onDragStart=(event:DragEvent)=>{
      if(!editing)return;
      const target=event.target as HTMLElement|null;
      const section=target?getSection(target):null;
      if(!section)return;
      dragKey=section.getAttribute('data-vs-section-key')||'';
      event.dataTransfer?.setData('application/krishan-page-section',dragKey);
      if(event.dataTransfer)event.dataTransfer.effectAllowed='move';
    };
    const onDragOver=(event:DragEvent)=>{
      if(!editing||!dragKey)return;
      if((event.target as HTMLElement|null)?.closest('[data-vs-ui]'))return;
      if(getSection(event.target as HTMLElement)?.parentElement===sectionContainer)event.preventDefault();
    };
    const onDrop=(event:DragEvent)=>{
      if(!editing||!dragKey||!sectionContainer)return;
      const target=event.target as HTMLElement|null;const targetSection=target?getSection(target):null;
      const moving=sectionContainer.querySelector('[data-vs-section-key="'+CSS.escape(dragKey)+'"]') as HTMLElement|null;
      if(!targetSection||!moving||targetSection===moving)return;
      event.preventDefault();event.stopPropagation();
      const rect=targetSection.getBoundingClientRect();
      sectionContainer.insertBefore(moving,event.clientY<rect.top+rect.height/2?targetSection:targetSection.nextSibling);
      draft.order=Array.from(sectionContainer.children).map(child=>(child as HTMLElement).getAttribute('data-vs-section-key')||'').filter(Boolean);
      persist();dragKey='';
    };
    const applyMessage=(event:MessageEvent)=>{
      if(event.source!==window.parent||!event.data||event.data.source!=='krishan-visual-parent')return;
      const {type}=event.data;
      if(type==='vs:mode'){editing=Boolean(event.data.editing);document.documentElement.classList.toggle('krishan-visual-editing',editing);send('vs:ready',{pageTitle:document.title,editing});return;}
      if(type==='vs:save'){persist();return;}
      if(type==='vs:text'&&selected){const text=String(event.data.value??'');selected.textContent=text;const key=selected.getAttribute('data-vs-key')||'';if(key)draft.texts[key]=text;persist();}
      if(type==='vs:style'&&selected){const property=String(event.data.property||'');const value=String(event.data.value??'');if(['color','backgroundColor','fontSize','textAlign','padding','margin','display'].includes(property)){(selected.style as any)[property]=value;const key=selected.getAttribute('data-vs-key')||'';if(key){draft.styles[key]={...(draft.styles[key]||{}),[property]:value};if(property==='display'&&value==='none'&&!draft.hidden.includes(key))draft.hidden.push(key);if(property==='display'&&value!=='none')draft.hidden=draft.hidden.filter(id=>id!==key);}persist();}}
      if(type==='vs:move'&&selected){const section=getSection(selected);const direction=Number(event.data.direction);if(section&&sectionContainer&&direction!==0){const sibling=direction<0?section.previousElementSibling:section.nextElementSibling;if(sibling)sectionContainer.insertBefore(section,direction<0?sibling: sibling.nextElementSibling);draft.order=Array.from(sectionContainer.children).map(child=>(child as HTMLElement).getAttribute('data-vs-section-key')||'').filter(Boolean);persist();}}
      if(type==='vs:hide'&&selected){const key=selected.getAttribute('data-vs-key')||'';const hidden=Boolean(event.data.hidden);selected.style.display=hidden?'none':'';draft.hidden=hidden?[...new Set([...draft.hidden,key])]:draft.hidden.filter(id=>id!==key);persist();}
      if(type==='vs:add'){const kind=String(event.data.kind||'text');const text=String(event.data.text||({heading:'New heading',text:'Write your text here',button:'Button label',card:'New content card'} as Record<string,string>)[kind]||'');const id='vs-added-'+Math.random().toString(36).slice(2,10);const container=getContainer();if(container){const node=createBlock(kind,text);node.setAttribute('data-vs-added',id);node.setAttribute('data-vs-key',id);const section=selected?getSection(selected):null;if(section?.parentElement===container)container.insertBefore(node,section.nextSibling);else container.appendChild(node);draft.added.push({id,kind,text});select(node);persist();}}
    };
    const mo=new MutationObserver(()=>{assignKeys();});
    assignKeys();apply();
    editing=true;
    document.addEventListener('click',onClick,true);
    document.addEventListener('dblclick',onDoubleClick,true);
    document.addEventListener('focusout',onBlur,true);
    document.addEventListener('dragstart',onDragStart,true);
    document.addEventListener('dragover',onDragOver,true);
    document.addEventListener('drop',onDrop,true);
    window.addEventListener('message',applyMessage);
    mo.observe(document.querySelector('main')||document.body,{childList:true,subtree:true});
    send('vs:ready',{pageTitle:document.title,editing:true});
    return ()=>{
      document.documentElement.classList.remove('krishan-visual-editing');
      document.removeEventListener('click',onClick,true);
      document.removeEventListener('dblclick',onDoubleClick,true);
      document.removeEventListener('focusout',onBlur,true);
      document.removeEventListener('dragstart',onDragStart,true);
      document.removeEventListener('dragover',onDragOver,true);
      document.removeEventListener('drop',onDrop,true);
      window.removeEventListener('message',applyMessage);
      mo.disconnect();
    };
  },[enabled]);
  return null;
};
