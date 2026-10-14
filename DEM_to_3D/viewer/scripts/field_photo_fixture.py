"""Synthetic JPEG with GPS/time EXIF, clearly marked as a software test fixture."""
import base64,struct
from pathlib import Path
def create_field_photo(browser,folder):
    fixture=browser.new_page()
    jpeg=base64.b64decode(fixture.evaluate("""()=>{const c=document.createElement('canvas');c.width=640;c.height=420;const x=c.getContext('2d');x.fillStyle='#e4e8eb';x.fillRect(0,0,640,420);x.fillStyle='#243242';x.font='20px sans-serif';x.fillText('TEST PHOTO - no disaster assessment',30,40);return c.toDataURL('image/jpeg').split(',')[1];}"""));fixture.close()
    model=b'Test Camera\0';model_at=50;gps_at=model_at+len(model);rational_at=gps_at+54
    entry=lambda tag,kind,count,value:struct.pack('<HHI',tag,kind,count)+(struct.pack('<I',value) if isinstance(value,int) else value)
    tiff=b'II*\0'+struct.pack('<I',8)+struct.pack('<H',3)+entry(272,2,len(model),model_at)+entry(34853,4,1,gps_at)+entry(34665,4,1,rational_at+48)+b'\0'*4+model
    tiff+=struct.pack('<H',4)+entry(1,2,2,b'N\0\0\0')+entry(2,5,3,rational_at)+entry(3,2,2,b'E\0\0\0')+entry(4,5,3,rational_at+24)+b'\0'*4
    tiff+=b''.join(struct.pack('<II',value,1) for value in [21,47,0,104,3,0])
    captured=b'2026:09:29 08:30:15\0'
    tiff+=struct.pack('<H',1)+entry(36867,2,len(captured),rational_at+48+18)+b'\0'*4+captured
    app1=b'Exif\0\0'+tiff
    jpg=Path(folder)/'field-photo-test.jpg';jpg.write_bytes(jpeg[:2]+b'\xff\xe1'+struct.pack('>H',len(app1)+2)+app1+jpeg[2:])
    return jpg
