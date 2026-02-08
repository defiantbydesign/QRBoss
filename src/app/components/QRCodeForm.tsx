'use client';
import { useState, useEffect, useActionState } from "react"
import { generateQRCode } from "../actions/generateQRCode";

export default function QRCodeForm(){
    const [selectedOption, setSelectedOption] = useState('optionURL')
    const [downloadFormat, setDownloadFormat] = useState('png')
    const [decodedData, setDecodedData] = useState('')
    const setAndLogDecoded = (v: string) => {
        console.log('Decoded data (final):', v)
        setDecodedData(v)
    }
    const [urlInput, setUrlInput] = useState('')
    // vCard fields - detailed breakdown
    const [vfirst, setVfirst] = useState('')
    const [vlast, setVlast] = useState('')
    const [vorg, setVorg] = useState('')
    const [vemail, setVemail] = useState('')
    const [vworkphone, setVworkphone] = useState('')
    const [vmobilephone, setVmobilephone] = useState('')
    const [vfax, setVfax] = useState('')
    const [vtitle, setVtitle] = useState('')
    const [vurl, setVurl] = useState('')
    const [vstreet, setVstreet] = useState('')
    const [vcity, setVcity] = useState('')
    const [vstate, setVstate] = useState('')
    const [vzip, setVzip] = useState('')
    const [vcountry, setVcountry] = useState('')
    
    const handleOptionChange = (event: any) => {
        setSelectedOption(event.target.value)
    }

    const [state, action, isGenerating] = useActionState(generateQRCode, {
        selectedOption: 'optionURL',
        url: '',
        name: '',
        email: '',
        qrCode: null,
        qrCodeSvg: null,
        vcardFN: null,
        vcardEMAIL: null,
        vcardTEL: null,
        vcardORG: null,
        vcardTITLE: null,
        vcardURL: null,
        vcardADR: null,
        vcardNOTE: null,
    })

    // keep local urlInput in sync with action state.url when it changes
    useEffect(()=>{
        if (state?.url && state.url !== urlInput) setUrlInput(state.url)
    },[state?.url])

    const handleDownload = () => {
        // Generate filename based on content type
        let baseFilename = 'qrcode'
        if (selectedOption === 'optionVCard' && (vfirst || vlast)) {
            const first = vfirst || 'Contact'
            const last = vlast || ''
            baseFilename = [first, last].filter(Boolean).join('_') + '_QRCode'
        } else if (selectedOption === 'optionURL' && urlInput) {
            try {
                const url = new URL(urlInput.startsWith('http') ? urlInput : 'https://' + urlInput)
                baseFilename = url.hostname + '_QRCode'
            } catch {
                baseFilename = urlInput.replace(/[^a-zA-Z0-9.-]/g, '_') + '_QRCode'
            }
        }

        if (downloadFormat === 'png' && state.qrCode) {
            const link = document.createElement('a');
            link.href = state.qrCode;
            link.download = baseFilename + '.png';
            link.click();
        } else if (downloadFormat === 'svg' && state.qrCodeSvg) {
            const link = document.createElement('a');
            link.href = 'data:image/svg+xml;base64,' + btoa(state.qrCodeSvg);
            link.download = baseFilename + '.svg';
            link.click();
        }
    }

    const handleFileUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setDecodedData('');
        try {
            console.log('Decoding: start', file.type, file.name);
            // Try BarcodeDetector if available (direct file)
            if ((window as any).BarcodeDetector) {
                console.log('Decoding: trying BarcodeDetector on file via createImageBitmap');
                try {
                    const imgBitmap = await createImageBitmap(file);
                    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                    const results = await detector.detect(imgBitmap);
                    console.log('BarcodeDetector results:', results);
                    if (results && results.length > 0 && results[0].rawValue) {
                        setAndLogDecoded(results[0].rawValue);
                        return;
                    }
                } catch (bdErr) {
                    console.warn('BarcodeDetector (file) error:', bdErr);
                }
            } else {
                console.log('BarcodeDetector not available in this browser');
            }

            // Fallback to html5-qrcode dynamic import if available
            try {
                console.log('Decoding: trying html5-qrcode.scanFile dynamic import');
                const h5 = await import('html5-qrcode');
                const Html5Any: any = h5.Html5Qrcode || h5.Html5QrcodeScanner || h5.default || h5;
                if (Html5Any && typeof Html5Any.scanFile === 'function') {
                    const res = await Html5Any.scanFile(file, true);
                    console.log('html5-qrcode scanFile result:', res);
                    if (res) {
                        if (Array.isArray(res) && res[0]) { setAndLogDecoded(res[0]); }
                        else if (typeof res === 'string') { setAndLogDecoded(res); }
                        else if (res?.decodedText) { setAndLogDecoded(res.decodedText); }
                        return;
                    }
                } else {
                    console.log('html5-qrcode does not expose scanFile on this build');
                }
            } catch (err) {
                console.warn('html5-qrcode dynamic import failed or scanFile not available', err);
            }

            // Canvas fallback + BarcodeDetector attempt
            const url = URL.createObjectURL(file);
            const img = document.createElement('img');
            img.src = url;
            await img.decode();
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);

            console.log('Decoding: canvas drawn, attempting BarcodeDetector on canvas');
            if ((window as any).BarcodeDetector) {
                try {
                    const bitmap = await createImageBitmap(canvas);
                    const detector2 = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                    const r2 = await detector2.detect(bitmap);
                    console.log('BarcodeDetector (canvas) results:', r2);
                    if (r2 && r2.length > 0 && r2[0].rawValue) {
                        setAndLogDecoded(r2[0].rawValue);
                        return;
                    }
                } catch (bd2Err) {
                    console.warn('BarcodeDetector (canvas) error:', bd2Err);
                }
            }

            // Try jsQR fallback (npm package 'jsqr')
            try {
                console.log('Decoding: trying jsqr fallback (dynamic import)');
                const mod = await import('jsqr');
                const jsQR = mod.default || mod;
                const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
                if (imageData) {
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    console.log('jsQR result:', code);
                    if (code && code.data) {
                        setAndLogDecoded(code.data);
                        return;
                    }
                }
            } catch (jsErr) {
                console.warn('jsQR import/decoding failed. Install `jsqr` to enable this fallback:', jsErr);
            }

            setAndLogDecoded('');
        } catch (err) {
            console.error('Failed to decode QR image', err);
            setAndLogDecoded('');
        }
    }

    // build vCard text from fields
    function generateVCardString(fields: {first?:string,last?:string,org?:string,email?:string,workphone?:string,mobilephone?:string,fax?:string,title?:string,url?:string,street?:string,city?:string,state?:string,zip?:string,country?:string}){
        const lines: string[] = ['BEGIN:VCARD','VERSION:3.0']
        // Build full name for FN, N fields
        const fn = [fields.first, fields.last].filter(Boolean).join(' ') || 'Contact'
        lines.push(`FN:${fn}`)
        // N format: Family;Given;Additional;Prefix;Suffix
        lines.push(`N:${fields.last || ''};${fields.first || ''};;;`)
        if (fields.org) lines.push(`ORG:${fields.org}`)
        if (fields.email) lines.push(`EMAIL:${fields.email}`)
        if (fields.workphone) lines.push(`TEL;TYPE=WORK:${fields.workphone}`)
        if (fields.mobilephone) lines.push(`TEL;TYPE=CELL:${fields.mobilephone}`)
        if (fields.fax) lines.push(`TEL;TYPE=FAX:${fields.fax}`)
        if (fields.title) lines.push(`TITLE:${fields.title}`)
        if (fields.url) lines.push(`URL:${fields.url}`)
        // Build address: Street;Extended;City;State;Zip;Country
        if (fields.street || fields.city || fields.state || fields.zip || fields.country) {
            lines.push(`ADR:;${fields.street || ''};${fields.city || ''};${fields.state || ''};${fields.zip || ''};${fields.country || ''}`)
        }
        lines.push('END:VCARD')
        return lines.join('\n')
    }

    // parse decoded vCard and populate fields
    useEffect(()=>{
        if (!decodedData) return;
        const text = decodedData.trim();
        if (text.toUpperCase().startsWith('BEGIN:VCARD')){
            // set selected option to vCard UI
            setSelectedOption('optionVCard')
            const lines = text.split(/\r?\n/);
            const map: Record<string,string> = {};
            for (const line of lines){
                const m = line.match(/^([A-Z]+)(?:;[^:]*)?:(.*)$/i);
                if (m){
                    const key = m[1].toUpperCase();
                    const val = m[2];
                    map[key] = val;
                }
            }
            console.log('vCard parsed map:', map);
            // Only use N (structured name), never FN or ORG
            // N format: Family;Given;Additional;Prefix;Suffix
            if (map['N']) {
                const nParts = map['N'].split(';');
                const nLast = (nParts[0] || '').trim();
                const nFirst = (nParts[1] || '').trim();
                if (nLast) setVlast(nLast)
                if (nFirst) setVfirst(nFirst)
            }
            // Parse other fields
            if (map['ORG']) setVorg(map['ORG'])
            if (map['EMAIL']) setVemail(map['EMAIL'])
            if (map['TITLE']) setVtitle(map['TITLE'])
            if (map['URL']) setVurl(map['URL'])
            if (map['ROLE']) setVtitle(map['ROLE']) // backup for title
            // Parse phone numbers by TYPE
            const telLines = Object.entries(map).filter(([k]) => k.toUpperCase() === 'TEL');
            for (const [_, telVal] of telLines) {
                if (telVal.includes('WORK')) setVworkphone(telVal.split(':')[1] || '')
                else if (telVal.includes('CELL')) setVmobilephone(telVal.split(':')[1] || '')
                else if (telVal.includes('FAX')) setVfax(telVal.split(':')[1] || '')
            }
            // Parse address: Street;Extended;City;State;Zip;Country
            if (map['ADR']) {
                const adrParts = map['ADR'].split(';');
                if (adrParts[1]) setVstreet(adrParts[1].trim())
                if (adrParts[2]) setVcity(adrParts[2].trim())
                if (adrParts[3]) setVstate(adrParts[3].trim())
                if (adrParts[4]) setVzip(adrParts[4].trim())
                if (adrParts[5]) setVcountry(adrParts[5].trim())
            }
        } else {
            // non-vCard content — assume URL or plain text and populate URL input for editing
            if (/^https?:\/\//i.test(text) || /^[^\s]+\.[^\s]{2,}/.test(text)){
                setSelectedOption('optionURL')
                setUrlInput(text)
            } else {
                // fall back to placing raw text into urlInput so user can edit/regenerate
                setSelectedOption('optionURL')
                setUrlInput(text)
            }
        }
    },[decodedData])

    // Log generated QR codes when they appear in action state
    useEffect(()=>{
        if (state?.qrCode) console.log('Generated QR code (data URL):', state.qrCode);
        if (state?.qrCodeSvg) console.log('Generated QR code (SVG):', state.qrCodeSvg);
    },[state?.qrCode, state?.qrCodeSvg])

    // Log when action finishes
    useEffect(()=>{
        if (!isGenerating) console.log('QR action completed. Current state:', state);
    },[isGenerating])

    return(
        <>
            <form action={action}>
                <div>
                    <input
                        type="radio"
                        name="type"
                        id="url"
                        value="optionURL"
                        checked={selectedOption === 'optionURL'}
                        onChange={handleOptionChange}
                        />                
                        <label htmlFor="url">Website</label>
                    <input
                        type="radio"
                        name="type"
                        id="vcard"
                        value="optionVCard"
                        checked={selectedOption === 'optionVCard'}
                        onChange={handleOptionChange}
                    />
                    <label htmlFor="vcard">vCard</label>
                    <input
                        type="radio"
                        name="type"
                        id="submit"
                        value="optionSubmit"
                        checked={selectedOption === 'optionSubmit'}
                        onChange={handleOptionChange}
                    />
                    <label htmlFor="submit">Submit</label>
                </div>

                {selectedOption === 'optionURL' && (
                    <>
                        <label htmlFor="urlInput">Enter URL:</label>
                        <input
                            type="text"
                            id="urlInput"
                            name="urlInput"
                            placeholder="https://example.com"
                            value={urlInput}
                            onChange={(e)=>setUrlInput(e.target.value)}
                            />
                        <button type="submit" disabled={isGenerating}>Generate QR Code</button>
                    </>
                )}
                {selectedOption === 'optionVCard' && (
                    <>
                        <label htmlFor="vfirst">First Name</label>
                        <input id="vfirst" name="vfirst" value={vfirst} onChange={(e)=>setVfirst(e.target.value)} />

                        <label htmlFor="vlast">Last Name</label>
                        <input id="vlast" name="vlast" value={vlast} onChange={(e)=>setVlast(e.target.value)} />

                        <label htmlFor="vorg">Organization</label>
                        <input id="vorg" name="vorg" value={vorg} onChange={(e)=>setVorg(e.target.value)} />

                        <label htmlFor="vemail">Email</label>
                        <input id="vemail" name="vemail" value={vemail} onChange={(e)=>setVemail(e.target.value)} />

                        <label htmlFor="vworkphone">Work Phone</label>
                        <input id="vworkphone" name="vworkphone" value={vworkphone} onChange={(e)=>setVworkphone(e.target.value)} />

                        <label htmlFor="vmobilephone">Mobile Phone</label>
                        <input id="vmobilephone" name="vmobilephone" value={vmobilephone} onChange={(e)=>setVmobilephone(e.target.value)} />

                        <label htmlFor="vfax">Fax</label>
                        <input id="vfax" name="vfax" value={vfax} onChange={(e)=>setVfax(e.target.value)} />

                        <label htmlFor="vtitle">Title</label>
                        <input id="vtitle" name="vtitle" value={vtitle} onChange={(e)=>setVtitle(e.target.value)} />

                        <label htmlFor="vurl">Website</label>
                        <input id="vurl" name="vurl" value={vurl} onChange={(e)=>setVurl(e.target.value)} />

                        <label htmlFor="vstreet">Street</label>
                        <input id="vstreet" name="vstreet" value={vstreet} onChange={(e)=>setVstreet(e.target.value)} />

                        <label htmlFor="vcity">City</label>
                        <input id="vcity" name="vcity" value={vcity} onChange={(e)=>setVcity(e.target.value)} />

                        <label htmlFor="vstate">State</label>
                        <input id="vstate" name="vstate" value={vstate} onChange={(e)=>setVstate(e.target.value)} />

                        <label htmlFor="vzip">Zip</label>
                        <input id="vzip" name="vzip" value={vzip} onChange={(e)=>setVzip(e.target.value)} />

                        <label htmlFor="vcountry">Country</label>
                        <input id="vcountry" name="vcountry" value={vcountry} onChange={(e)=>setVcountry(e.target.value)} />

                        {/* hidden field with full vCard payload for server action */}
                        <input type="hidden" name="vcard" value={generateVCardString({first:vfirst,last:vlast,org:vorg,email:vemail,workphone:vworkphone,mobilephone:vmobilephone,fax:vfax,title:vtitle,url:vurl,street:vstreet,city:vcity,state:vstate,zip:vzip,country:vcountry})} />

                        <button type="submit" disabled={isGenerating}>Generate vCard QR</button>
                    </>
                )}
                {selectedOption === 'optionSubmit' && (
                    <>
                        <label htmlFor="uploadQR">Upload QR image:</label>
                        <input
                            type="file"
                            id="uploadQR"
                            name="uploadQR"
                            accept="image/*"
                            onChange={handleFileUploadChange}
                            />

                        <button type="submit" disabled={isGenerating}>Submit QR Code</button>
                    </>
                )}
                

            </form>

            {state.qrCode && (
                <div style={{ marginTop: '20px' }}>
                    <h3>Generated QR Code:</h3>
                    <img src={state.qrCode} alt="QR Code" style={{ border: '1px solid #ccc' }} />
                    
                    <div style={{ marginTop: '15px' }}>
                        <label>Download Format: </label>
                        <select 
                            value={downloadFormat} 
                            onChange={(e) => setDownloadFormat(e.target.value)}
                            style={{ marginLeft: '10px' }}>
                            <option value="png">PNG</option>
                            <option value="svg">SVG</option>
                        </select>
                        <button 
                            onClick={handleDownload}
                            style={{ marginLeft: '10px' }}>
                            Download QR Code
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}