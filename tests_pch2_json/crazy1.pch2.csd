<CsoundSynthesizer>
<CsOptions>
</CsOptions>
<CsInstruments>
sr = 44100 ;96000?
kr = 22050 ;24000?
nchnls = 2
0dbfs = 1

gkBPM init 120 ; GLOBAL TEMPO
gaFX1 init 0 ; do we really need 3&4 fx bus?
gaFX2 init 0
gaFX3 init 0
gaFX4 init 0
;gaBU1 init 0 ; do we really need 3&4 bus?
;gaBU2 init 0

opcode K2Y, k, k  ; THIS IS TEMPORARY!
    kin xin
    kout = (kin > 0 ? 1 : 0)
    xout kout
endop

opcode A2O, a, a  ; THIS IS TEMPORARY!
    setksmps 1
    ain xin
    kin = k(ain)
    kout = (kin > 0 ? 1 : 0)
    xout a(kout)
endop



;---------------------------------
; Zak space initialization
gkNote init 64
gkGate init 0
zakinit 9, 9
massign 1,0
massign 2,0
massign 3,0
massign 4,0

;---------------------------------
; Waveforms
giSin ftgen 1, 0, 16384, 10, 1
giCos ftgen 11, 0, 16384, 11, 1, 1
giTri ftgen 2, 0, 16384, 7, 0, 4096, 1, 8192, -1, 4096, 0
;giTriP ftgen 2, 0, 16384, 7, 0, 8192, 1, 8192, 0
giTriF ftgen 24, 0, 16384, 7, -1, 8192, 1, 8192, -1
giSaw ftgen 3, 0, 16384, 7, 1, 16384, -1
giSqr50 ftgen 4, 0, 16384, 7, 1, 8192, 1, 0, -1, 8192, -1
giSqr25 ftgen 5, 0, 16384, 7, 1, 4096, 1, 0, -0.25, 12288, -0.25
giSqr10 ftgen 6, 0, 16384, 7, 1, 1024, 1, 0, -0.0625, 15360, -0.0625
giSq400 ftgen 21, 0, 16384, 7,1,41,1,0,0,16343,0 ; Sync_Wave Table CLKGEN
giSq96 ftgen 22, 0, 16384, 7,1,1366,1,0,0,15018,0 ; 1/96_Wave Table CLKGEN
giSq16 ftgen 23, 0, 16384, 7,1,910,1,0,0,15474,0 ; 1/16_Wave Table CLKGEN

;---------------------------------

;---------------------------------
; Function tables for maps
giDLY5m8 ftgen 100, 0, 128, -2, 0.0, 0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.04, 0.04, 0.05, 0.05, 0.06, 0.06, 0.07, 0.07, 0.08, 0.08, 0.09, 0.1, 0.1, 0.11, 0.11, 0.12, 0.12, 0.13, 0.13, 0.14, 0.14, 0.15, 0.15, 0.16, 0.16, 0.17, 0.17, 0.18, 0.18, 0.19, 0.19, 0.2, 0.2, 0.21, 0.21, 0.22, 0.23, 0.23, 0.24, 0.24, 0.25, 0.25, 0.26, 0.26, 0.27, 0.27, 0.28, 0.28, 0.29, 0.29, 0.3, 0.3, 0.31, 0.31, 0.32, 0.32, 0.33, 0.33, 0.34, 0.35, 0.35, 0.36, 0.36, 0.37, 0.37, 0.38, 0.38, 0.39, 0.39, 0.4, 0.4, 0.41, 0.41, 0.42, 0.42, 0.43, 0.43, 0.44, 0.44, 0.45, 0.45, 0.46, 0.46, 0.47, 0.48, 0.48, 0.49, 0.49, 0.5, 0.5, 0.51, 0.51, 0.52, 0.52, 0.53, 0.53, 0.54, 0.54, 0.55, 0.55, 0.56, 0.56, 0.57, 0.57, 0.58, 0.58, 0.59, 0.6, 0.6, 0.61, 0.61, 0.62, 0.62, 0.63, 0.63, 0.64, 0.64, 0.65, 0.65, 0.66, 0.66
giDLY258 ftgen 101, 0, 128, -2, 0.0, 0.03, 0.05, 0.08, 0.1, 0.13, 0.15, 0.17, 0.2, 0.22, 0.25, 0.27, 0.3, 0.32, 0.35, 0.37, 0.4, 0.42, 0.45, 0.47, 0.5, 0.52, 0.55, 0.57, 0.6, 0.62, 0.64, 0.67, 0.69, 0.72, 0.74, 0.77, 0.79, 0.82, 0.84, 0.87, 0.89, 0.92, 0.94, 0.97, 0.99, 1.02, 1.04, 1.07, 1.09, 1.11, 1.14, 1.16, 1.19, 1.21, 1.24, 1.26, 1.29, 1.31, 1.34, 1.36, 1.39, 1.41, 1.44, 1.46, 1.49, 1.51, 1.54, 1.56, 1.58, 1.61, 1.63, 1.66, 1.68, 1.71, 1.73, 1.76, 1.78, 1.81, 1.83, 1.86, 1.88, 1.91, 1.93, 1.96, 1.98, 2.01, 2.03, 2.05, 2.08, 2.1, 2.13, 2.15, 2.18, 2.2, 2.23, 2.25, 2.28, 2.3, 2.33, 2.35, 2.38, 2.4, 2.43, 2.45, 2.48, 2.5, 2.52, 2.55, 2.57, 2.6, 2.62, 2.65, 2.67, 2.7, 2.72, 2.75, 2.77, 2.8, 2.82, 2.85, 2.87, 2.9, 2.92, 2.95, 2.97, 2.99, 3.02, 3.04, 3.07, 3.09, 3.12, 3.14
giDLY5h8 ftgen 102, 0, 128, -2, 0.0, 0.49, 0.99, 1.48, 1.97, 2.46, 2.95, 3.45, 3.94, 4.43, 4.92, 5.42, 5.91, 6.41, 6.89, 7.38, 7.88, 8.37, 8.86, 9.35, 9.85, 10.3, 10.8, 11.3, 11.8, 12.3, 12.8, 13.3, 13.8, 14.3, 14.8, 15.3, 15.8, 16.2, 16.7, 17.2, 17.7, 18.2, 18.7, 19.2, 19.7, 20.2, 20.7, 21.2, 21.7, 22.1, 22.6, 23.1, 23.6, 24.1, 24.6, 25.1, 25.6, 26.1, 26.6, 27.1, 27.6, 28.1, 28.5, 29.0, 29.5, 30.0, 30.5, 31.0, 31.5, 32.0, 32.5, 33.0, 33.5, 34.0, 34.5, 34.9, 35.4, 35.9, 36.4, 36.9, 37.4, 37.9, 38.4, 38.9, 39.4, 39.9, 40.4, 40.9, 41.3, 41.8, 42.3, 42.8, 43.3, 43.8, 44.3, 44.8, 45.3, 45.8, 46.3, 46.8, 47.3, 47.7, 48.2, 48.7, 49.2, 49.7, 50.2, 50.7, 51.2, 51.7, 52.2, 52.7, 53.2, 53.6, 54.1, 54.6, 55.1, 55.6, 56.1, 56.6, 57.1, 57.6, 58.1, 58.6, 59.1, 59.6, 60.0, 60.5, 61.0, 61.5, 62.0, 62.5
giDLY1s8 ftgen 103, 0, 128, -2, 0.0, 0.99, 1.97, 2.95, 3.94, 4.92, 5.91, 6.89, 7.88, 8.86, 9.85, 10.8, 11.8, 12.8, 13.8, 14.8, 15.8, 16.7, 17.7, 18.7, 19.7, 20.7, 21.7, 22.6, 23.6, 24.6, 25.6, 26.6, 27.6, 28.5, 29.5, 30.5, 31.5, 32.5, 33.5, 34.5, 35.4, 36.4, 37.4, 38.4, 39.4, 40.4, 41.3, 42.3, 43.3, 44.3, 45.3, 46.3, 47.3, 48.2, 49.2, 50.2, 51.2, 52.2, 53.2, 54.1, 55.1, 56.1, 57.1, 58.1, 59.1, 60.0, 61.0, 62.0, 63.0, 64.0, 65.0, 66.0, 66.9, 67.9, 68.9, 69.9, 70.9, 71.9, 72.8, 73.8, 74.8, 75.8, 76.8, 77.8, 78.8, 79.7, 80.7, 81.7, 82.7, 83.7, 84.7, 85.6, 86.6, 87.6, 88.6, 89.6, 90.6, 91.5, 92.5, 93.5, 94.5, 95.5, 96.5, 97.5, 98.4, 99.4, 100.0, 101.0, 102.0, 103.0, 104.0, 105.0, 106.0, 107.0, 108.0, 109.0, 110.0, 111.0, 112.0, 113.0, 114.0, 115.0, 116.0, 117.0, 118.0, 119.0, 120.0, 121.0, 122.0, 123.0, 124.0, 125.0
giDLY278 ftgen 104, 0, 128, -2, 0.0, 2.66, 5.32, 7.97, 10.6, 13.3, 15.9, 18.6, 21.3, 23.9, 26.6, 39.2, 31.9, 34.5, 37.2, 39.9, 42.5, 45.2, 47.8, 50.5, 53.2, 55.8, 58.5, 61.1, 63.8, 66.4, 69.1, 71.8, 74.4, 77.1, 79.7, 82.4, 85.0, 87.7, 90.4, 93.0, 95.7, 98.3, 101.0, 104.0, 106.0, 109.0, 112.0, 114.0, 117.0, 120.0, 122.0, 125.0, 128.0, 130.0, 133.0, 136.0, 138.0, 141.0, 144.0, 146.0, 149.0, 151.0, 154.0, 157.0, 159.0, 162.0, 165.0, 167.0, 170.0, 173.0, 175.0, 178.0, 181.0, 183.0, 186.0, 189.0, 191.0, 194.0, 197.0, 199.0, 202.0, 205.0, 207.0, 210.0, 213.0, 215.0, 218.0, 221.0, 223.0, 226.0, 229.0, 231.0, 234.0, 237.0, 239.0, 242.0, 244.0, 247.0, 250.0, 252.0, 255.0, 258.0, 260.0, 263.0, 266.0, 268.0, 271.0, 274.0, 276.0, 279.0, 282.0, 284.0, 287.0, 290.0, 292.0, 295.0, 298.0, 300.0, 303.0, 306.0, 308.0, 311.0, 314.0, 316.0, 319.0, 322.0, 324.0, 327.0, 330.0, 332.0, 335.0, 338.0
giDLY1h8 ftgen 105, 0, 128, -2, 0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.69, 0.79, 0.89, 0.99, 1.09, 1.19, 1.29, 1.39, 1.49, 1.58, 1.68, 1.78, 1.88, 1.98, 2.08, 2.18, 2.28, 2.38, 2.48, 2.57, 2.67, 2.77, 2.87, 2.97, 3.07, 3.17, 3.27, 3.37, 3.46, 3.56, 3.66, 3.76, 3.86, 3.96, 4.06, 4.16, 4.26, 4.36, 4.45, 4.55, 4.65, 4.75, 4.85, 4.95, 5.05, 5.15, 5.25, 5.35, 5.44, 5.54, 5.64, 5.74, 5.84, 5.94, 6.04, 6.14, 6.24, 6.33, 6.43, 6.53, 6.63, 6.73, 6.83, 6.93, 7.03, 7.13, 7.23, 7.32, 7.42, 7.52, 7.62, 7.72, 7.82, 7.92, 8.02, 8.12, 8.21, 8.31, 8.41, 8.51, 8.61, 8.71, 8.81, 8.91, 9.01, 9.11, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 10.0, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 11.0, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 12.0, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
giLVLlev ftgen 106, 0, 128, -2, -64.0, -63.0, -62.0, -61.0, -60.0, -59.0, -58.0, -57.0, -56.0, -55.0, -54.0, -53.0, -52.0, -51.0, -50.0, -49.0, -48.0, -47.0, -46.0, -45.0, -44.0, -43.0, -42.0, -41.0, -40.0, -39.0, -38.0, -37.0, -36.0, -35.0, -34.0, -33.0, -32.0, -31.0, -30.0, -29.0, -28.0, -27.0, -26.0, -25.0, -24.0, -23.0, -22.0, -21.0, -20.0, -19.0, -18.0, -17.0, -16.0, -15.0, -14.0, -13.0, -12.0, -11.0, -10.0, -9.0, -8.0, -7.0, -6.0, -5.0, -4.0, -3.0, -2.0, -1.0, 0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0, 20.0, 21.0, 22.0, 23.0, 24.0, 25.0, 26.0, 27.0, 28.0, 29.0, 30.0, 31.0, 32.0, 33.0, 34.0, 35.0, 36.0, 37.0, 38.0, 39.0, 40.0, 41.0, 42.0, 43.0, 44.0, 45.0, 46.0, 47.0, 48.0, 49.0, 50.0, 51.0, 52.0, 53.0, 54.0, 55.0, 56.0, 57.0, 58.0, 59.0, 60.0, 61.0, 62.0, 64.0
giDLY2s8 ftgen 107, 0, 128, -2, 0.0, 1.97, 3.94, 5.91, 7.88, 9.85, 11.8, 13.8, 15.8, 17.7, 19.7, 21.7, 23.6, 25.6, 27.6, 29.5, 31.5, 33.5, 35.4, 37.4, 39.4, 41.3, 43.3, 45.3, 47.3, 49.2, 51.2, 53.2, 55.1, 57.1, 59.1, 61.0, 63.0, 65.0, 66.9, 68.9, 70.9, 72.8, 74.8, 76.8, 78.8, 80.7, 82.7, 84.7, 86.6, 88.6, 90.6, 92.5, 94.5, 96.5, 98.4, 100.0, 102.0, 104.0, 106.0, 108.0, 110.0, 112.0, 114.0, 116.0, 118.0, 120.0, 122.0, 124.0, 126.0, 128.0, 130.0, 132.0, 134.0, 136.0, 138.0, 140.0, 142.0, 144.0, 146.0, 148.0, 150.0, 152.0, 154.0, 156.0, 158.0, 159.0, 161.0, 163.0, 165.0, 167.0, 169.0, 171.0, 173.0, 175.0, 177.0, 179.0, 181.0, 183.0, 185.0, 187.0, 189.0, 191.0, 193.0, 195.0, 197.0, 199.0, 201.0, 203.0, 205.0, 207.0, 209.0, 211.0, 213.0, 215.0, 217.0, 219.0, 221.0, 222.0, 224.0, 226.0, 228.0, 230.0, 232.0, 234.0, 236.0, 238.0, 240.0, 242.0, 244.0, 246.0, 248.0, 250.0

;---------------------------------
; UDO section

opcode A2K, 0, ii
izaIn, izkOut xin
aIn zar izaIn
zkw k(aIn), izkOut
endop

opcode DlyEight, 0, kkkkkkkkkkk
kTime,kRange,kin,ko1,ko2,ko3,ko4,ko5,ko6,ko7,ko8 xin
ain zar kin

if kRange == 0 then
kTime table kTime, giDLY5m8
elseif kRange == 1 then
kTime table kTime, giDLY258
elseif kRange == 2 then
kTime table kTime, giDLY1h8
elseif kRange == 3 then
kTime table kTime, giDLY5h8
elseif kRange == 4 then
kTime table kTime, giDLY1s8
elseif kRange == 5 then
kTime table kTime, giDLY2s8
elseif kRange == 6 then
kTime table kTime, giDLY278

kTime /= 8

abuf delayr 2.7
a1 deltapi a(kTime)
a2 deltapi a(kTime)*2
a3 deltapi a(kTime)*3
a4 deltapi a(kTime)*4
a5 deltapi a(kTime)*5
a6 deltapi a(kTime)*6
a7 deltapi a(kTime)*7
a8 deltapi a(kTime)*8
delayw ain

zaw a1, ko1
zaw a2, ko2
zaw a3, ko3
zaw a4, ko4
zaw a5, ko5
zaw a6, ko6
zaw a7, ko7
zaw a8, ko8
endop

opcode K2A, 0, ii
izkIn, izaOut xin
kIn zkr izkIn
zaw a(kIn), izaOut
endop

opcode seqCtr,0,kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
;16 steps,16 events, pulse,pol,xfade,rnd,clear
;inputs:
; ctrl,val,trig
;outputs:
; val,trig

kN0,kN1,kN2,kN3,kN4,kN5,kN6,kN7,kN8,kN9,kNA,kNB,kNC,kND,kNE,kNF,
kG0,kG1,kG2,kG3,kG4,kG5,kG6,kG7,kG8,kG9,kGA,kGB,kGC,kGD,kGE,kGF,
kPulse,kPol,kXF,kRnd,kClr,
kctri,kvali,ktrigi, kvalo,ktrigo xin

; INIT
kVal[] fillarray i(kN0),i(kN1),i(kN2),i(kN3),i(kN4),i(kN5),i(kN6),i(kN7),i(kN8),i(kN9),i(kNA),i(kNB),i(kNC),i(kND),i(kNE),i(kNF)
kGate[] fillarray i(kG0),i(kG1),i(kG2),i(kG3),i(kG4),i(kG5),i(kG6),i(kG7),i(kG8),i(kG9),i(kGA),i(kGB),i(kGC),i(kGD),i(kGE),i(kGF)
ifn1 ftgen 0, 0, 64, -2, 0
ifn2 ftgen 0, 0, 64, -2, 0
kPark init 1  ; there's no park out, but can be used for GUI
kValo init 0
kTrigo init 0

kCtr zkr kctri
kCtr *= 64 ; signals are (-1..1) or (0..1)
kVali zkr kvali
kTrigi zkr ktrigi

kChanged1 init 1
kChanged2 init 1

if kChanged1 != 1 goto Over1
; copy arrays to tables if changed
kndxx = 0
until kndxx == 16 do
ktmp = kVal[kndxx]
tabw ktmp, 4*kndxx,   ifn1
tabw ktmp, 4*kndxx+1, ifn1
tabw ktmp, 4*kndxx+2, ifn1
tabw ktmp, 4*kndxx+3, ifn1
kndxx += 1
od
Over1:

if kChanged2 != 1 goto Over2
; copy arrays to tables if changed
kndxx = 0
until kndxx == 16 do
ktmp = kGate[kndxx]
tabw ktmp, 4*kndxx,   ifn2
tabw ktmp, 4*kndxx+1, ifn2
tabw ktmp, 4*kndxx+2, ifn2
tabw ktmp, 4*kndxx+3, ifn2
kndxx += 1
od
Over2:

if (changed(kN0)==1) then
kVal[0] = kN0
goto Changed1
endif
if (changed(kN1)==1) then
kVal[1] = kN1
goto Changed1
endif
if (changed(kN2)==1) then
kVal[2] = kN2
goto Changed1
endif
if (changed(kN3)==1) then
kVal[3] = kN3
goto Changed1
endif
if (changed(kN4)==1) then
kVal[4] = kN4
goto Changed1
endif
if (changed(kN5)==1) then
kVal[5] = kN5
goto Changed1
endif
if (changed(kN6)==1) then
kVal[6] = kN6
goto Changed1
endif
if (changed(kN7)==1) then
kVal[7] = kN7
goto Changed1
endif
if (changed(kN8)==1) then
kVal[8] = kN8
goto Changed1
endif
if (changed(kN9)==1) then
kVal[9] = kN9
goto Changed1
endif
if (changed(kNA)==1) then
kVal[10] = kNA
goto Changed1
endif
if (changed(kNB)==1) then
kVal[11] = kNB
goto Changed1
endif
if (changed(kNC)==1) then
kVal[12] = kNC
goto Changed1
endif
if (changed(kND)==1) then
kVal[13] = kND
goto Changed1
endif
if (changed(kNE)==1) then
kVal[14] = kNE
goto Changed1
endif
if (changed(kNF)==1) then
kVal[15] = kNF
goto Changed1
endif
kChanged1 = 0

if (changed(kG0)==1) then
kGate[0] = kG0
goto Changed2
endif
if (changed(kG1)==1) then
kGate[1] = kG1
goto Changed2
endif
if (changed(kG2)==1) then
kGate[2] = kG2
goto Changed2
endif
if (changed(kG3)==1) then
kGate[3] = kG3
goto Changed2
endif
if (changed(kG4)==1) then
kGate[4] = kG4
goto Changed2
endif
if (changed(kG5)==1) then
kGate[5] = kG5
goto Changed2
endif
if (changed(kG6)==1) then
kGate[6] = kG6
goto Changed2
endif
if (changed(kG7)==1) then
kGate[7] = kG7
goto Changed2
endif
if (changed(kG8)==1) then
kGate[8] = kG8
goto Changed2
endif
if (changed(kG9)==1) then
kGate[9] = kG9
goto Changed2
endif
if (changed(kGA)==1) then
kGate[10] = kGA
goto Changed2
endif
if (changed(kGB)==1) then
kGate[11] = kGB
goto Changed2
endif
if (changed(kGC)==1) then
kGate[12] = kGC
goto Changed2
endif
if (changed(kGD)==1) then
kGate[13] = kGD
goto Changed2
endif
if (changed(kGE)==1) then
kGate[14] = kGE
goto Changed2
endif
if (changed(kGF)==1) then
kGate[15] = kGF
goto Changed2
endif

kChanged2 = 0
goto SkipChanged2
Changed2:
kChanged2 = 1
SkipChanged2:

; CLEAR
kClr_ trigger kClr,0.5,0
if kClr_ != 1 goto Next
kndxx = 0
until kndxx == 64 do
tabw 64, kndxx, ifn1
kndxx += 1
od
Next:

; RANDOM
krnd_ trigger kRnd,0.5,0
if krnd_ != 1 goto Next1
kndxx = 0
until kndxx == 64 do
tabw k(limit(int(rand(64)+64),0,127)), kndxx, ifn1
kndxx += 1
od
Next1:
goto SkipChanged1
Changed1:
kChanged1 = 1
SkipChanged1:

; read tables
if (kCtr < 0) || (kCtr > 63) then
kPark = 0
else
kPark = 1
kTrigo table kCtr, ifn2
if kXF < 2 then
kValo table kCtr, ifn1
elseif kXF == 2 then  ; xFade 50%
kValo1 table kCtr, ifn1
kValo2 table kCtr, ifn1,0,1,1
kValo = (kValo1 + kValo2)/2
else  ; xFade 100%
kValo1 table kCtr, ifn1
kValo2 table kCtr, ifn1,0,1,1
kValo3 table kCtr, ifn1,0,2,1
kValo4 table kCtr, ifn1,0,3,1
kValo = (kValo1 + kValo2 + kValo3 + kValo4)/4
endif
endif

kClk trigger kCtr%4,0.1,1
if kPulse == 1 goto Gate
if (kClk == 1) && (kTrigo == 1) then
kTrigo = 1
else kTrigo = 0
endif
Gate:

if kPol != 1 goto Bipol
zkw limit((kPark*kValo/127 + kVali),-4,4), kvalo
kgoto Over
Bipol:
kValo table kValo,giLVLlev ; 0...127 -> -64...+64
zkw limit((kPark*kValo/64 + kVali),-4,4), kvalo
Over:
zkw limit((kPark*kTrigo + kTrigi),0,4), ktrigo
endop

; --------------------
; VOICE AREA
instr 1
; Module    Name             Parameters                                                                  Modes    Inlets    Outlets
DlyEight    /* DlyEight1 */  0,                                                                          0,       9,        7,0,0,0,0,0,8,0
seqCtr      /* SeqCtr1 */    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,           8,1,7,    9,0
A2K                                                                                                               7,        7
A2K                                                                                                               8,        8
K2A                                                                                                               9,        9
endin

; --------------------
; FX AREA
instr 2
; Module    Name    Parameters    Modes    Inlets    Outlets
endin

; GLOBAL MIDI
gkstat init 0
gkchan init 0
gkdata1 init 0
gkdata2 init 0
instr 3
  gkstat, gkchan, gkdata1, gkdata2 midiin
  if gkstat != 144 goto Next
    gkGate = 1
    gkNote = gkdata1
  Next:
  if gkstat!=128 goto Over
    gkGate = 0
  Over:
endin

; FOR OFFLINE RENDERING
instr 4
  xtratim 0.1
  gkGate linsegr 1, p3, 1, 0, 0
  gkNote = p4 ; in 7b MIDI format
endin
</CsInstruments>
<CsScore>
i1 0 [60*60*24*7]
i2 0 [60*60*24*7]
i3 0 [60*60*24*7]
; use i4 to emultate MIDI commands if needed
; p4 is pitch
;i4 0 1 64
</CsScore>
</CsoundSynthesizer>