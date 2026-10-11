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
  <path d="M17.6134 8.25998C16.2978 6.20996 15.3264 4.37671 14.6097 3.52412C13.7956 2.55558 12.6497 2.29088 11.1369 2.0336C9.55978 1.7654 8.5105 2.26166 7.3566 2.7399C5.32196 3.58317 4.36734 4.54144 2.9588 5.74586C2.16262 6.42666 1.71177 7.27493 1.32749 8.30318C0.70964 9.95641 1.10228 12.9251 1.39973 14.0365C1.6522 14.9797 2.10218 15.7672 3.3759 17.8139C5.11087 20.6018 6.03239 21.1662 8.11051 23.2054C9.13612 24.2117 11.8865 26.2777 14.6633 28.4362C15.9585 29.4431 17.085 30.4928 17.9652 31.1976C18.1747 31.3654 18.4372 31.4147 18.6953 31.3892C19.7449 31.2852 20.2519 30.3645 21.225 29.7502C22.5009 28.9446 23.5851 27.7828 24.5034 26.8456C25.6982 25.6263 26.4799 24.565 27.7509 23.1179C28.7719 21.9554 29.2126 20.9168 29.5782 19.7965C29.9811 18.5619 30.8301 16.7672 31.5224 14.3848C32.3222 11.6323 32.4582 10.1259 32.5255 9.03941C32.653 6.98381 31.7878 4.93581 30.9863 3.26228C30.6401 2.53929 30.2417 1.97426 29.8237 1.60985C28.9509 0.84889 26.0035 0.944333 23.7471 1.13263C22.373 1.24729 21.1098 2.94088 20.2819 4.05157C19.4305 5.1866 18.5361 6.62152 18.2253 7.36414C18.1019 7.70501 18.0484 7.97284 17.912 8.57343" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M5.5001 4C10.7001 -0.800003 16.0001 5 18.0001 8.5C19.8334 4.83333 24.8001 -1.49999 30.0001 2.50001C35.2001 6.50001 30.8334 18.1667 28.0001 23.5L19.0001 31.5C17.1668 30.6667 12.2001 27.6 7.0001 22C0.500105 15 -0.999895 10 5.5001 4Z" fill="#121212" mask={`url(#${id})`}/>
 </svg>;
}
