"use client";
import { useRef,useState,type KeyboardEvent } from "react";
import type { Chess,Square,Color } from "chess.js";
const names={k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
const symbols={k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
export function ChessBoard({board,orientation,selected,onSquare,complete}:{board:Chess;orientation:Color;selected:Square|null;onSquare:(square:Square)=>void;complete:boolean}){
 const [focus,setFocus]=useState(0),ref=useRef<HTMLDivElement>(null);
 const files=orientation==='w'?'abcdefgh':'hgfedcba',ranks=orientation==='w'?'87654321':'12345678';
 const destinations=new Set(selected?board.moves({square:selected,verbose:true}).map(move=>move.to):[]);
 function navigate(event:KeyboardEvent<HTMLButtonElement>,index:number){let next=index;const col=index%8,row=Math.floor(index/8);if(event.key==='ArrowRight')next=row*8+Math.min(7,col+1);else if(event.key==='ArrowLeft')next=row*8+Math.max(0,col-1);else if(event.key==='ArrowDown')next=Math.min(7,row+1)*8+col;else if(event.key==='ArrowUp')next=Math.max(0,row-1)*8+col;else if(event.key==='Home')next=row*8;else if(event.key==='End')next=row*8+7;else return;event.preventDefault();setFocus(next);ref.current?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus();}
 return <div ref={ref} role="grid" aria-label={`Chessboard, ${orientation==='w'?'White':'Black'} at bottom. Arrow keys navigate; Enter or Space selects a square.`} aria-rowcount={8} aria-colcount={8} className="mx-auto w-full max-w-md overflow-hidden rounded-lg border border-line-strong">
 {[...ranks].map((rank,row)=><div role="row" key={rank} className="grid grid-cols-8">{[...files].map((file,col)=>{const square=(file+rank) as Square,piece=board.get(square),index=row*8+col,isSelected=selected===square,destination=destinations.has(square),light=('abcdefgh'.indexOf(file)+Number(rank))%2===0;
 return <button type="button" role="gridcell" aria-rowindex={row+1} aria-colindex={col+1} aria-selected={isSelected} aria-disabled={complete} key={square} data-index={index} tabIndex={focus===index?0:-1} onFocus={()=>setFocus(index)} onKeyDown={event=>navigate(event,index)} onClick={()=>onSquare(square)}
 aria-label={`${square}, ${piece?`${piece.color==='w'?'White':'Black'} ${names[piece.type]}`:'empty'}${isSelected?', selected':''}${destination?', legal destination':''}`}
 className="relative flex aspect-square touch-manipulation items-center justify-center focus-visible:z-10 focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-blue-600"
 style={{background:light?'#e8dcc6':'#6e7a68',boxShadow:isSelected?'inset 0 0 0 4px #7854cf':destination?'inset 0 0 0 3px #3b4492':undefined}}>
 <span aria-hidden="true" className="absolute left-0.5 top-0 text-[9px] font-semibold" style={{color:light?'#273325':'#ffffff'}}>{square}</span>
 {piece&&<span aria-hidden="true" className="select-none text-[clamp(25px,8vw,44px)] leading-none" style={{color:piece.color==='w'?'#fffef7':'#17211b',textShadow:piece.color==='w'?'1px 0 #17211b,-1px 0 #17211b,0 1px #17211b,0 -1px #17211b':'0 1px #eeeecc'}}>{symbols[piece.type]}</span>}
 {!piece&&destination&&<span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#3b4492]" />}
 </button>;})}</div>)}
 </div>;
}
