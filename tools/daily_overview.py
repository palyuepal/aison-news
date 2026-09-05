#!/usr/bin/env python3
from pathlib import Path
import json, os

W, H = 1200, 1500
NAVY = (6, 26, 58)
NAVY_2 = (2, 14, 32)
NAVY_3 = (9, 34, 67)
YELLOW = (255, 198, 20)
GOLD = (209, 157, 38)
WHITE = (255, 255, 255)
MUTED = (187, 198, 216)
BLUE = (39, 130, 246)
GREEN = (30, 190, 128)

FONT_REGULAR_CANDIDATES = [
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/opentype/noto/NotoSansCJKtc-Regular.otf',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
]
FONT_BOLD_CANDIDATES = [
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
    '/usr/share/fonts/opentype/noto/NotoSansCJKtc-Bold.otf',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc',
]

def _required():
    return os.getenv('AISON_REQUIRE_SOCIAL_CARDS', '').strip() == '1'

def _find_font(candidates):
    custom = os.getenv('AISON_SOCIAL_FONT', '').strip()
    if custom and Path(custom).exists():
        return custom
    return next((p for p in candidates if Path(p).exists()), None)

def _units(text):
    text = str(text or '')
    units=[]; i=0; spaced=False
    while i < len(text):
        ch=text[i]
        if ch.isspace():
            spaced=True; i+=1; continue
        if ch.isascii() and (ch.isalnum() or ch in '#+.$%&/-'):
            j=i+1
            while j < len(text):
                c=text[j]
                if c.isascii() and (c.isalnum() or c in '#+.$%&/-'):
                    j+=1; continue
                if c==' ' and j+1 < len(text) and text[j+1].isascii() and (text[j+1].isalnum() or text[j+1] in '#+.$%&/-'):
                    j+=1; continue
                break
            units.append((text[i:j].strip(),spaced)); spaced=False; i=j; continue
        units.append((ch,spaced)); spaced=False; i+=1
    return [(u,s) for u,s in units if u]

def _wrap(draw,text,font,max_width,max_lines):
    units=_units(text); lines=[]; current=''; consumed=0
    for idx,(unit,had_space) in enumerate(units):
        sep=' ' if current and had_space else ''
        test=current+sep+unit
        if not current or draw.textlength(test,font=font) <= max_width:
            current=test
        else:
            lines.append(current.strip()); current=unit
            if len(lines) >= max_lines:
                consumed=idx; break
    else:
        consumed=len(units)
    if len(lines) < max_lines and current: lines.append(current.strip())
    if consumed < len(units) and lines:
        last=lines[-1]
        while last and draw.textlength(last+'…',font=font)>max_width:
            last=last[:-1]
        lines[-1]=last.rstrip()+'…'
    return lines[:max_lines]

def _cutout_mascot(mascot,Image,ImageDraw):
    rgba=mascot.convert('RGBA').resize((520,520),Image.Resampling.LANCZOS)
    try:
        ImageDraw.floodfill(rgba,(260,35),(0,0,0,0),thresh=62)
        ImageDraw.floodfill(rgba,(45,260),(0,0,0,0),thresh=44)
    except Exception:
        pass
    px=rgba.load(); cx=cy=260
    for y in range(520):
        for x in range(520):
            rr=((x-cx)**2+(y-cy)**2)**0.5
            if rr>246:
                r,g,b,a=px[x,y]; px[x,y]=(r,g,b,0)
            elif rr>232:
                r,g,b,a=px[x,y]
                alpha=max(0,min(255,int((246-rr)/14*255)))
                px[x,y]=(r,g,b,min(a,alpha))
    return rgba

def _gradient(Image,ImageDraw):
    image=Image.new('RGB',(W,H),NAVY_2); d=ImageDraw.Draw(image)
    for x in range(W):
        t=x/(W-1)
        r=int(NAVY[0]*(1-t)+NAVY_2[0]*t); g=int(NAVY[1]*(1-t)+NAVY_2[1]*t); b=int(NAVY[2]*(1-t)+NAVY_2[2]*t)
        d.line((x,0,x,H),fill=(r,g,b))
    return image

def _globe(image,ImageDraw,ImageFilter):
    glow=image.convert('RGBA'); glow.putalpha(0); gd=ImageDraw.Draw(glow)
    cx,cy,r=945,150,255
    gd.ellipse((cx-r-20,cy-r-20,cx+r+20,cy+r+20),outline=(255,202,74,180),width=26)
    glow=glow.filter(ImageFilter.GaussianBlur(22)); image.paste(glow,(0,0),glow)
    d=ImageDraw.Draw(image)
    d.ellipse((cx-r,cy-r,cx+r,cy+r),fill=(8,29,52),outline=(255,201,72),width=4)
    for inset in (42,90,136):
        d.arc((cx-r+inset,cy-r,cx+r-inset,cy+r),202,338,fill=(212,158,45),width=2)
        d.arc((cx-r+inset,cy-r,cx+r-inset,cy+r),22,158,fill=(212,158,45),width=2)
    pts=[(830,95),(900,55),(980,78),(1065,132),(915,160),(1005,190),(850,215),(1090,228)]
    for a,b in [(0,1),(1,2),(2,3),(0,4),(4,5),(4,6),(5,7),(2,5)]:
        d.line((pts[a],pts[b]),fill=(230,176,48),width=2)
    for x,y in pts: d.ellipse((x-4,y-4,x+4,y+4),fill=(255,220,105))

def _short_title(story):
    title=str(story.get('title') or '').strip()
    for sep in ('，','；','。'):
        if sep in title:
            head=title.split(sep,1)[0].strip()
            if len(head)>=8: return head
    return title

def _edition(data):
    dates=sorted({str(n.get('date') or '') for n in data if n.get('date')},reverse=True)
    if not dates: return '', list(data)[:10]
    latest=dates[0]
    current=sorted([n for n in data if str(n.get('date'))==latest],key=lambda n:n.get('rank',999))[:10]
    if len(current)<10:
        current=sorted(list(data),key=lambda n:n.get('rank',999))[:10]
    return latest,current

def build_daily_overview(data,site,root):
    try:
        from PIL import Image,ImageDraw,ImageFont,ImageFilter
    except Exception as exc:
        if _required(): raise SystemExit(f'Daily overview required but Pillow unavailable: {exc}')
        print('Daily overview skipped: Pillow unavailable.')
        return None
    regular=_find_font(FONT_REGULAR_CANDIDATES); bold=_find_font(FONT_BOLD_CANDIDATES)
    mascot_path=Path(root)/'assets'/'mascot.webp'
    if not regular or not bold or not mascot_path.exists():
        detail=f'font={regular or "missing"}, bold={bold or "missing"}, mascot={mascot_path.exists()}'
        if _required(): raise SystemExit(f'Daily overview required but renderer assets unavailable: {detail}')
        print(f'Daily overview skipped: {detail}')
        return None
    def font(size,boldface=False): return ImageFont.truetype(bold if boldface else regular,size)
    edition,stories=_edition(data)
    if not stories:
        if _required(): raise SystemExit('Daily overview requires at least one story')
        return None
    image=_gradient(Image,ImageDraw); _globe(image,ImageDraw,ImageFilter); draw=ImageDraw.Draw(image)
    draw.polygon([(705,0),(835,0),(765,150),(678,228)],fill=(199,145,28))
    draw.polygon([(765,150),(835,0),(956,0),(812,240)],fill=(255,210,78))

    draw.text((56,42),'AI',font=font(50,True),fill=YELLOW); aiw=draw.textlength('AI',font=font(50,True))
    draw.text((56+aiw,42),'son',font=font(50,True),fill=WHITE)
    draw.line((215,53,215,101),fill=(145,160,184),width=2)
    draw.text((245,55),'香港人的每日 AI 新聞站',font=font(25,True),fill=WHITE)
    draw.text((58,145),'今日 AI',font=font(76,True),fill=YELLOW)
    draw.text((58,225),'10 件事',font=font(76,True),fill=WHITE)
    draw.text((60,324),'一眼睇晒今日最值得知道的 AI 變化',font=font(24,True),fill=(221,228,239))
    draw.rounded_rectangle((60,370,245,416),radius=23,fill=YELLOW)
    draw.text((87,379),'DAILY BRIEF',font=font(18,True),fill=NAVY)
    draw.text((270,381),edition,font=font(19),fill=MUTED)
    verified=sum(1 for s in stories if s.get('verified'))
    draw.ellipse((425,374,461,410),fill=BLUE); draw.line((435,392,442,399),fill=WHITE,width=4); draw.line((442,399,452,384),fill=WHITE,width=4)
    draw.text((474,380),f'{verified}/10 已核實',font=font(19,True),fill=WHITE)

    mascot=Image.open(mascot_path); cutout=_cutout_mascot(mascot,Image,ImageDraw).resize((365,365),Image.Resampling.LANCZOS)
    image.paste(cutout,(720,28),cutout); draw=ImageDraw.Draw(image)

    xcols=[58,620]; y0=452; card_w=520; card_h=182; gap=18
    for idx,story in enumerate(stories[:10]):
        col=0 if idx<5 else 1; row=idx if idx<5 else idx-5
        x=xcols[col]; y=y0+row*(card_h+gap)
        top3=idx<3
        fill=(8,31,61) if not top3 else (19,38,62)
        outline=YELLOW if top3 else (57,78,108)
        draw.rounded_rectangle((x,y,x+card_w,y+card_h),radius=22,fill=fill,outline=outline,width=3 if top3 else 1)
        badge_fill=YELLOW if top3 else (18,54,91)
        badge_text=NAVY if top3 else WHITE
        draw.rounded_rectangle((x+18,y+18,x+80,y+70),radius=16,fill=badge_fill)
        draw.text((x+31,y+23),str(idx+1).zfill(2),font=font(24,True),fill=badge_text)
        category=str(story.get('category') or 'AI')
        catfont=font(14,True); cw=draw.textlength(category,font=catfont)
        draw.rounded_rectangle((x+card_w-cw-42,y+20,x+card_w-18,y+52),radius=16,fill=(22,48,79))
        draw.text((x+card_w-cw-30,y+25),category,font=catfont,fill=(217,225,237))
        title=_short_title(story)
        title_lines=_wrap(draw,title,font(25,True),card_w-120,2)
        ty=y+22
        for line in title_lines:
            draw.text((x+100,ty),line,font=font(25,True),fill=WHITE); ty+=34
        excerpt=str(story.get('excerpt') or '')
        e_lines=_wrap(draw,excerpt,font(15),card_w-42,2)
        ey=y+104
        for line in e_lines:
            draw.text((x+20,ey),line,font=font(15),fill=MUTED); ey+=24
        impact=(story.get('hkImpact') or [''])[0] if isinstance(story.get('hkImpact'),list) else ''
        if impact:
            impact_short=_wrap(draw,'HK｜'+str(impact),font(13),card_w-42,1)[0]
            draw.text((x+20,y+154),impact_short,font=font(13),fill=(255,214,88))

    draw.line((58,1460,880,1460),fill=(90,109,138),width=1)
    draw.text((58,1468),'aison.hk',font=font(18,True),fill=(218,226,238))
    draw.text((825,1468),'AI  ×  PEOPLE  ×  A BRIGHTER HONG KONG',font=font(13),fill=(193,204,220))

    out_dir=Path(root)/'assets'/'social'; out_dir.mkdir(parents=True,exist_ok=True)
    dated=out_dir/f'daily-{edition}.jpg' if edition else out_dir/'daily-overview.jpg'
    latest=out_dir/'daily-latest.jpg'
    image.save(dated,'JPEG',quality=88,optimize=True,progressive=True,subsampling='4:2:0')
    image.save(latest,'JPEG',quality=88,optimize=True,progressive=True,subsampling='4:2:0')
    for p in (dated,latest):
        with Image.open(p) as check:
            if check.size != (W,H): raise SystemExit(f'Daily overview size mismatch for {p.name}: {check.size}')
            check.verify()
    print(f'Built AIson daily overview: {latest.name} / {W}x{H} / {len(stories)} stories.')
    return {'path':str(latest),'dated_path':str(dated),'edition':edition,'count':len(stories)}


def main():
    root=Path(__file__).resolve().parents[1]
    data=json.loads((root/'content'/'news.json').read_text(encoding='utf-8'))
    site_path=root/'content'/'site.json'
    site=json.loads(site_path.read_text(encoding='utf-8')) if site_path.exists() else {}
    result=build_daily_overview(data,site,root)
    if _required() and not result:
        raise SystemExit('Daily overview card was required but not generated.')

if __name__=='__main__':
    main()
