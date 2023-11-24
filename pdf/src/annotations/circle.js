/*
 * (c) Copyright Ascensio System SIA 2010-2019
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 20A-12 Ernesta Birznieka-Upisha
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

(function(){

    /**
	 * Class representing a Ink annotation.
	 * @constructor
    */
    function CAnnotationCircle(sName, nPage, aRect, oDoc)
    {
        AscPDF.CAnnotationBase.call(this, sName, AscPDF.ANNOTATIONS_TYPES.Circle, nPage, aRect, oDoc);
        AscFormat.CShape.call(this);
        AscPDF.initShape(this);
        this.spPr.setGeometry(AscFormat.CreateGeometry("ellipse"));
        this.setStyle(AscFormat.CreateDefaultShapeStyle("ellipse"));

        this._point         = undefined;
        this._popupOpen     = false;
        this._popupRect     = undefined;
        this._richContents  = undefined;
        this._rotate        = undefined;
        this._state         = undefined;
        this._stateModel    = undefined;
        this._width         = undefined;

        // internal
        TurnOffHistory();
        this.content        = new AscPDF.CTextBoxContent(this, oDoc);
    }
	CAnnotationCircle.prototype.constructor = CAnnotationCircle;
    AscFormat.InitClass(CAnnotationCircle, AscFormat.CShape, AscDFH.historyitem_type_Shape);
    Object.assign(CAnnotationCircle.prototype, AscPDF.CAnnotationBase.prototype);

    CAnnotationCircle.prototype.IsNeedDrawFromStream = function() {
        return false;
    };
    CAnnotationCircle.prototype.LazyCopy = function() {
        let oDoc = this.GetDocument();
        oDoc.TurnOffHistory();

        let oCircle = new CAnnotationCircle(AscCommon.CreateGUID(), this.GetPage(), this.GetRect().slice(), oDoc);

        oCircle._pagePos = {
            x: this._pagePos.x,
            y: this._pagePos.y,
            w: this._pagePos.w,
            h: this._pagePos.h
        }
        oCircle._origRect = this._origRect.slice();

        this.fillObject(oCircle);

        oCircle.pen = new AscFormat.CLn();
        oCircle._apIdx = this._apIdx;
        oCircle._originView = this._originView;
        oCircle.SetOriginPage(this.GetOriginPage());
        oCircle.SetAuthor(this.GetAuthor());
        oCircle.SetModDate(this.GetModDate());
        oCircle.SetCreationDate(this.GetCreationDate());
        oCircle.SetWidth(this.GetWidth());
        oCircle.SetStrokeColor(this.GetStrokeColor().slice());
        oCircle.SetFillColor(this.GetFillColor());
        oCircle.recalcInfo.recalculatePen = false;
        oCircle.recalcInfo.recalculateGeometry = true;
        oCircle.recalculate();

        return oCircle;
    };
    CAnnotationCircle.prototype.RefillGeometry = function() {
        let aRect = this.GetRect();

        let x = aRect[0]; // X координата верхнего левого угла прямоугольника
        let y = aRect[1]; // Y координата верхнего левого угла прямоугольника
        let w = aRect[2] - aRect[0]; // Ширина прямоугольника
        let h = aRect[3] - aRect[1]; // Высота прямоугольника

        // Рассчитываем параметры эллипса
        let centerX = x + w / 2;
        let centerY = y + h / 2;
        let radiusX = w / 2;
        let radiusY = h / 2;

        // Функция для вычисления координат точек
        function calculateEllipsePoints(centerX, centerY, radiusX, radiusY, N) {
            let points = [];
            for (let i = 0; i < N; i++) {
                let angle = (2 * Math.PI / N) * i;
                let x = centerX + radiusX * Math.cos(angle);
                let y = centerY + radiusY * Math.sin(angle);
                points.push({x: x, y: y});
            }
            return points;
        }

        function approximateEllipseCircumference(rx, ry) {
            return Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
        }
        
        // длина эллипса
        const nEllipseLenght = approximateEllipseCircumference(radiusX, radiusY);
        const nCloudPoints = nEllipseLenght / 15;

        // Получаем точки
        let ellipsePoints = calculateEllipsePoints(centerX, centerY, radiusX, radiusY, nCloudPoints);

        let oViewer = editor.getDocumentRenderer();
        let oDoc    = oViewer.getPDFDoc();

        let aPoints = [];
        let aPointsCanvas = [];
        for (let i = 0; i < ellipsePoints.length; i++) {
            aPoints.push({
                x: ellipsePoints[i].x * g_dKoef_pix_to_mm,
                y: ellipsePoints[i].y * g_dKoef_pix_to_mm
            });

            aPointsCanvas.push({
                x: ellipsePoints[i].x,
                y: ellipsePoints[i].y
            });
        }
        
        let aShapeRectInMM = this.GetRect().map(function(measure) {
            return measure * g_dKoef_pix_to_mm;
        });

        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');

        ctx.beginPath();
        for (let i = 0; i < aPointsCanvas.length; i++) {
            let oPt1 = aPointsCanvas[i];
            let oPt2 = aPointsCanvas[i + 1];
            if (!oPt2)
                oPt2 = aPointsCanvas[0];

            let centerX = (oPt1.x + oPt2.x) / 2;
            let centerY = (oPt1.y + oPt2.y) / 2;
            let radius  = Math.sqrt(Math.pow(oPt2.x - oPt1.x, 2) + Math.pow(oPt2.y - oPt1.y, 2)) / 2 * 3/2;
            let angle   = Math.atan2(oPt1.y - centerY, oPt1.x - centerX);
            
            ctx.beginPath();
            
            ctx.arc(centerX, centerY, radius, angle + Math.PI/4, angle + Math.PI - Math.PI/8);
            if (i == 0) {
                let old = ctx.strokeStyle;
                ctx.strokeStyle = "red";
                ctx.stroke();
                ctx.strokeStyle = old;
            }
            else
                ctx.stroke();
        }
        
        oDoc.TurnOffHistory();
        generateGeometry([aPoints], aShapeRectInMM, this.spPr.geometry);
    };
    CAnnotationCircle.prototype.SetStrokeColor = function(aColor) {
        this._strokeColor = aColor;

        let oRGB    = this.GetRGBColor(aColor);
        let oFill   = AscFormat.CreateSolidFillRGBA(oRGB.r, oRGB.g, oRGB.b, 255);
        let oLine   = this.pen;
        oLine.setFill(oFill);
    };
    CAnnotationCircle.prototype.SetFillColor = function(aColor) {
        this._fillColor = aColor;

        let oRGB    = this.GetRGBColor(aColor);
        let oFill   = AscFormat.CreateSolidFillRGBA(oRGB.r, oRGB.g, oRGB.b, 255);
        this.setFill(oFill);
    };
    CAnnotationCircle.prototype.SetWidth = function(nWidthPt) {
        this._width = nWidthPt; 

        nWidthPt = nWidthPt > 0 ? nWidthPt : 0.5;
        let oLine = this.pen;
        oLine.setW(nWidthPt * g_dKoef_pt_to_mm * 36000.0);
    };
    CAnnotationCircle.prototype.Recalculate = function() {
        let oViewer     = editor.getDocumentRenderer();
        let nPage       = this.GetPage();
        let aOrigRect   = this.GetOrigRect();

        let nScaleY = oViewer.drawingPages[nPage].H / oViewer.file.pages[nPage].H / oViewer.zoom;
        let nScaleX = oViewer.drawingPages[nPage].W / oViewer.file.pages[nPage].W / oViewer.zoom;
        
        if (this.recalcInfo.recalculateGeometry)
            this.RefillGeometry();
        this.handleUpdatePosition();
        this.recalculate();
        this.updatePosition(aOrigRect[0] * g_dKoef_pix_to_mm * nScaleX, aOrigRect[1] * g_dKoef_pix_to_mm * nScaleY);
    };
    CAnnotationCircle.prototype.WriteToBinary = function(memory) {
        memory.WriteByte(AscCommon.CommandType.ctAnnotField);

        let nStartPos = memory.GetCurPosition();
        memory.Skip(4);

        this.WriteToBinaryBase(memory);
        this.WriteToBinaryBase2(memory);
        
        // rectangle diff
        let aRD = this.GetReqtangleDiff();
        if (aRD) {
            memory.annotFlags |= (1 << 15);
            for (let i = 0; i < 4; i++) {
                memory.WriteDouble(aRD[i]);
            }
        }
        
        // fill
        let aFill = this.GetFillColor();
        if (aFill != null) {
            memory.annotFlags |= (1 << 16);
            memory.WriteLong(aFill.length);
            for (let i = 0; i < aFill.length; i++)
                memory.WriteDouble(aFill[i]);
        }

        let nEndPos = memory.GetCurPosition();
        memory.Seek(memory.posForFlags);
        memory.WriteLong(memory.annotFlags);
        
        memory.Seek(nStartPos);
        memory.WriteLong(nEndPos - nStartPos);
        memory.Seek(nEndPos);

        this._replies.forEach(function(reply) {
            reply.WriteToBinary(memory); 
        });
    };
    
    function TurnOffHistory() {
        if (AscCommon.History.IsOn() == true)
            AscCommon.History.TurnOff();
    }

    function generateGeometry(arrOfArrPoints, aBounds, oGeometry) {
        let xMin = aBounds[0];
        let yMin = aBounds[1];
        let xMax = aBounds[2];
        let yMax = aBounds[3];

        let cx = xMin + (xMax - xMin) / 2;
        let cy = yMin + (yMax - yMin) / 2;

        let geometry = oGeometry ? oGeometry : new AscFormat.Geometry();
        if (oGeometry) {
            oGeometry.pathLst = [];
        }

        for (let nPath = 0; nPath < arrOfArrPoints.length; nPath++) {
            let bClosed     = false;
            let aPoints     = arrOfArrPoints[nPath];
            let min_dist    = editor.WordControl.m_oDrawingDocument.GetMMPerDot(3);
            let oLastPoint  = aPoints[aPoints.length-1];
            let nLastIndex  = aPoints.length-1;
            if(oLastPoint.bTemporary) {
                nLastIndex--;
            }
            if(nLastIndex > 1)
            {
                let dx = aPoints[0].x - aPoints[nLastIndex].x;
                let dy = aPoints[0].y - aPoints[nLastIndex].y;
                if(Math.sqrt(dx*dx +dy*dy) < min_dist)
                {
                    bClosed = true;
                }
            }
            let nMaxPtIdx = bClosed ? (nLastIndex - 1) : nLastIndex;

            let w = xMax - xMin, h = yMax-yMin;
            let kw, kh, pathW, pathH;
            if(w > 0)
            {
                pathW = 43200;
                kw = 43200/ w;
            }
            else
            {
                pathW = 0;
                kw = 0;
            }
            if(h > 0)
            {
                pathH = 43200;
                kh = 43200 / h;
            }
            else
            {
                pathH = 0;
                kh = 0;
            }
            
            function calculateRotationAngle(x1, y1, x2, y2, x, y) {
                // Находим середину линии AB
                let mx = (x1 + x2) / 2;
                let my = (y1 + y2) / 2;
            
                // Вычисляем углы
                let thetaAB = Math.atan2(y2 - y1, x2 - x1);
                let thetaMP = Math.atan2(y - my, x - mx);
            
                // Вычисляем угол поворота
                let rotationAngle = (thetaMP - thetaAB) * 180 / Math.PI + 90;
            
                // Нормализуем угол
                if (rotationAngle < 0) {
                    rotationAngle += 360;
                }
                return rotationAngle;
            }

            geometry.AddPathCommand(0,undefined, undefined, undefined, pathW, pathH);
            geometry.AddPathCommand(1, (((aPoints[0].x - xMin) * kw) >> 0) + "", (((aPoints[0].y - yMin) * kh) >> 0) + "");

            let oPt1, oPt2, nPt;
            for(nPt = 0; nPt < aPoints.length; nPt++) {
                // arc
                oPt1 = aPoints[nPt];
                oPt2 = aPoints[nPt + 1];
                if (oPt2 == null) {
                    oPt2 = aPoints[0];
                }

                let centerX = oPt1.x;
                let centerY = oPt1.y;

                let radius  = Math.sqrt(Math.pow(oPt2.x - oPt1.x, 2) + Math.pow(oPt2.y - oPt1.y, 2)) / 2;
                // let radius  = 2.9;
                // let angle   = Math.atan2(centerY - oPt2.y, centerX - oPt2.x);
                let angle   = Math.atan2(centerY - oPt2.y, centerX - oPt2.x);
                let angle2  = Math.atan2(centerX - cy, centerY - cx);
                
                let stAng = (angle) * (180 / Math.PI);
                let swAng = (Math.PI) * (180 / Math.PI);

                geometry.AddPathCommand(3, ((radius * kw) >> 0) + "", ((radius * kh) >> 0) + "", 
                (stAng * 60000 >> 0) + "", (swAng * 60000 >> 0) + "");

                geometry.AddPathCommand(1, (((oPt2.x - xMin) * kw) >> 0) + "", (((oPt2.y - yMin) * kh) >> 0) + "");

                // break;
            }

            geometry.AddPathCommand(0,undefined, undefined, undefined, pathW, pathH);
            geometry.AddPathCommand(1, (((aPoints[0].x - xMin) * kw) >> 0) + "", (((aPoints[0].y - yMin) * kh) >> 0) + "");

            let i = 1;
            let aRanges = [[0, aPoints.length - 1]];
            let aRange, nRange;
            let nEnd;
            let nPtsCount = aPoints.length;
            oPt1, oPt2, nPt;
            for(nRange = 0; nRange < aRanges.length; ++nRange)
            {
                aRange = aRanges[nRange];
                if(aRange[0] + 1 > nMaxPtIdx) {
                    break;
                }
                nPt = aRange[0] + 1;
                nEnd = Math.min(aRange[1], nMaxPtIdx);
                while(nPt <= nEnd)
                {
                    if(nPt + 2 <= nEnd)
                    {
                        //cubic bezier curve
                        oPt1 = aPoints[nPt++];
                        oPt2 = aPoints[nPt++];
                        oPt3 = aPoints[nPt++];
                        geometry.AddPathCommand(5,
                            (((oPt1.x - xMin) * kw) >> 0) + "", (((oPt1.y - yMin) * kh) >> 0) + "",
                            (((oPt2.x - xMin) * kw) >> 0) + "", (((oPt2.y - yMin) * kh) >> 0) + "",
                            (((oPt3.x - xMin) * kw) >> 0) + "", (((oPt3.y - yMin) * kh) >> 0) + ""
                        );
                    }
                    else if(nPt + 1 <= nEnd)
                    {
                        //quad bezier curve
                        oPt1 = aPoints[nPt++];
                        oPt2 = aPoints[nPt++];
                        geometry.AddPathCommand(4,
                            (((oPt1.x - xMin) * kw) >> 0) + "", (((oPt1.y - yMin) * kh) >> 0) + "",
                            (((oPt2.x - xMin) * kw) >> 0) + "", (((oPt2.y - yMin) * kh) >> 0) + ""
                        );
                    }
                    else
                    {
                        //lineTo
                        oPt1 = aPoints[nPt++];
                        geometry.AddPathCommand(2,
                            (((oPt1.x - xMin) * kw) >> 0) + "", (((oPt1.y - yMin) * kh) >> 0) + ""
                        );
                    }
                }
            }
            
            
            // geometry.AddPathCommand(6);
        }

        return geometry;
    }

    function calculateAngle(x1, y1, x2, y2) {
        var dy = y2 - y1;
        var dx = x2 - x1;
        var theta = Math.atan2(dy, dx); // диапазон [-PI, PI]
        theta *= 180 / Math.PI; // радианы в градусы
        // если нужен угол в диапазоне [0, 360)
        if (theta < 0) theta = 360 + theta;
        return theta;
    }

    window["AscPDF"].CAnnotationCircle = CAnnotationCircle;
})();

