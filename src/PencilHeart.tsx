import {useEffect,useId,useRef,useState} from 'react';

// Preserve the original hand-drawn Figma heart; reveal its fill with pencil strokes.
export function PencilHeart(){
 const ref=useRef<SVGSVGElement>(null),id=useId();
 const [active,setActive]=useState(false);
 useEffect(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window)){setActive(true);return;}
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setActive(true);observer.disconnect()}},{threshold:.6});
  if(ref.current)observer.observe(ref.current);
  return()=>observer.disconnect();
 },[]);
 return <svg ref={ref} className={`pencil-heart ${active?'is-coloring':''}`} viewBox="0 0 33.538 32.3954" aria-hidden="true">
  <defs><mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="34" height="33">
   <path className="pencil-stroke" pathLength="1" d="M-5 4 L40 -8 L40 -3 L-5 10 L-5 15 L40 2 L40 7 L-5 20 L-5 25 L40 12 L40 17 L-5 30 L-5 35 L40 22 L40 27 L-5 40 L-5 45 L40 32 L40 37 L-5 50" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
  </mask></defs>
  <image href={import.meta.env.BASE_URL+'icons/calendar-heart.svg'} width="33.538" height="32.3954" mask={`url(#${id})`}/>
 </svg>;
}
