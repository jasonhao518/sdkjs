/*
 * (c) Copyright Ascensio System SIA 2010-2023
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
 * You can contact Ascensio System SIA at 20A-6 Ernesta Birznieka-Upish
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

"use strict";


AscDFH.changesFactory[AscDFH.historyitem_PDF_Document_AddItem]			= CChangesPDFDocumentAddItem;
AscDFH.changesFactory[AscDFH.historyitem_PDF_Document_RemoveItem]		= CChangesPDFDocumentRemoveItem;
AscDFH.changesFactory[AscDFH.historyitem_PDF_Document_AddPage]			= CChangesPDFDocumentAddPage;
AscDFH.changesFactory[AscDFH.historyitem_PDF_Document_RemovePage]		= CChangesPDFDocumentRemovePage;
AscDFH.changesFactory[AscDFH.historyitem_PDF_Document_RotatePage]		= CChangesPDFDocumentRotatePage;
AscDFH.changesFactory[AscDFH.historyitem_PDF_Document_RecognizePage]	= CChangesPDFDocumentRecognizePage;
AscDFH.changesFactory[AscDFH.historyitem_PDF_Document_ChangePosInTree]	= CChangesPDFDocumentChangePosInTree;

/**
 * @constructor
 * @extends {AscDFH.CChangesBaseContentChange}
 */
function CChangesPDFDocumentAddItem(Class, Pos, Items)
{
	AscDFH.CChangesBaseContentChange.call(this, Class, Pos, Items, true);
}
CChangesPDFDocumentAddItem.prototype = Object.create(AscDFH.CChangesBaseContentChange.prototype);
CChangesPDFDocumentAddItem.prototype.constructor = CChangesPDFDocumentAddItem;
CChangesPDFDocumentAddItem.prototype.Type = AscDFH.historyitem_PDF_Document_AddItem;

CChangesPDFDocumentAddItem.prototype.Undo = function()
{
	let oDocument	= this.Class;
	let oDrDoc		= oDocument.GetDrawingDocument();
	let oViewer		= Asc.editor.getDocumentRenderer();
	
	for (var nIndex = 0, nCount = this.Items.length; nIndex < nCount; ++nIndex)
	{
		let nPos = true !== this.UseArray ? this.Pos : this.PosArray[nIndex];
		let oItem = this.Items[nIndex];

		if (oItem.IsAnnot()) {
			let nPage = oItem.GetPage();
			oItem.AddToRedraw();

			oDocument.annots.splice(nPos, 1);
			this.PosInPage = oViewer.pagesInfo.pages[nPage].annots.indexOf(oItem);
			oViewer.pagesInfo.pages[nPage].annots.splice(this.PosInPage, 1);
			if (oItem.IsComment())
				editor.sync_RemoveComment(oItem.GetId());
			
			oViewer.DrawingObjects.resetSelection();
		}
		else if (oItem.IsDrawing()) {
			let nPage = oItem.GetPage();
			oItem.AddToRedraw();

			oDocument.drawings.splice(nPos, 1);
			this.PosInPage = oViewer.pagesInfo.pages[nPage].drawings.indexOf(oItem);
			oViewer.pagesInfo.pages[nPage].drawings.splice(this.PosInPage, 1);
			oViewer.DrawingObjects.resetSelection();
		}
	}
	
	oDocument.SetMouseDownObject(null);
	oDrDoc.TargetEnd();
};
CChangesPDFDocumentAddItem.prototype.Redo = function()
{
	let oDocument	= this.Class;
	let oDrDoc		= oDocument.GetDrawingDocument();
	let oViewer		= Asc.editor.getDocumentRenderer();
	
	for (var nIndex = 0, nCount = this.Items.length; nIndex < nCount; ++nIndex)
	{
		let nPos = true !== this.UseArray ? this.Pos : this.PosArray[nIndex];
		let oItem = this.Items[nIndex];

		if (oItem.IsAnnot()) {
			let nPage = oItem.GetPage();
			oItem.AddToRedraw();

			oDocument.annots.splice(nPos, 0, oItem);
			oViewer.pagesInfo.pages[nPage].annots.splice(this.PosInPage, 0, oItem);
			if (oItem.IsComment())
				editor.sendEvent("asc_onAddComment", oItem.GetId(), oItem.GetAscCommentData());

			oItem.SetDisplay(oDocument.IsAnnotsHidden() ? window["AscPDF"].Api.Objects.display["hidden"] : window["AscPDF"].Api.Objects.display["visible"]);

			oViewer.DrawingObjects.resetSelection();
		}
		else if (oItem.IsDrawing()) {
			let nPage = oItem.GetPage();
			oItem.AddToRedraw();

			oDocument.drawings.splice(nPos, 0, oItem);
			oViewer.pagesInfo.pages[nPage].drawings.splice(this.PosInPage, 0, oItem);

			oViewer.DrawingObjects.resetSelection();
		}
	}

	oDocument.SetMouseDownObject(null);
	oDrDoc.TargetEnd();
};

/**
 * @constructor
 * @extends {AscDFH.CChangesBaseContentChange}
 */
function CChangesPDFDocumentRemoveItem(Class, Pos, Items)
{
	AscDFH.CChangesBaseContentChange.call(this, Class, Pos, Items, true);
}
CChangesPDFDocumentRemoveItem.prototype = Object.create(AscDFH.CChangesBaseContentChange.prototype);
CChangesPDFDocumentRemoveItem.prototype.constructor = CChangesPDFDocumentRemoveItem;
CChangesPDFDocumentRemoveItem.prototype.Type = AscDFH.historyitem_PDF_Document_RemoveItem;

CChangesPDFDocumentRemoveItem.prototype.Undo = function()
{
	let oDocument = this.Class;
	let oViewer = editor.getDocumentRenderer();
	
	for (var nIndex = 0, nCount = this.Items.length; nIndex < nCount; ++nIndex)
	{
		let nPos = this.Pos[0];
		let nPosInPage = this.Pos[1];

		let oItem = this.Items[nIndex];

		if (oItem.IsForm()) {
			if (oItem.IsWidget()) {
				let nPage = oItem.GetPage();
				oItem.AddToRedraw();

				oDocument.widgets.splice(nPos, 0, oItem);
				oViewer.pagesInfo.pages[nPage].fields.splice(nPosInPage, 0, oItem);
			}
			else {
				oDocument.widgetsParents.push(oItem);
			}
		}
		else if (oItem.IsAnnot()) {
			let nPage = oItem.GetPage();
			oItem.AddToRedraw();

			oDocument.annots.splice(nPos, 0, oItem);
			oViewer.pagesInfo.pages[nPage].annots.splice(nPosInPage, 0, oItem);
			if (oItem.GetReply(0) != null || oItem.GetType() != AscPDF.ANNOTATIONS_TYPES.FreeText && oItem.GetContents())
				editor.sendEvent("asc_onAddComment", oItem.GetId(), oItem.GetAscCommentData());

			oItem.SetDisplay(oDocument.IsAnnotsHidden() ? window["AscPDF"].Api.Objects.display["hidden"] : window["AscPDF"].Api.Objects.display["visible"]);
		}
		else if (oItem.IsDrawing()) {
			let nPage = oItem.GetPage();
			oItem.AddToRedraw();

			oDocument.drawings.splice(nPos, 0, oItem);
			oViewer.pagesInfo.pages[nPage].drawings.splice(nPosInPage, 0, oItem);
		}
	}

	oDocument.mouseDownAnnot = null;
};
CChangesPDFDocumentRemoveItem.prototype.Redo = function()
{
	var oDocument = this.Class;
	let oViewer = editor.getDocumentRenderer();
	
	for (var nIndex = 0, nCount = this.Items.length; nIndex < nCount; ++nIndex)
	{
		let nPos		= this.Pos[0];
		let nPosInPage	= this.Pos[1];

		let oItem = this.Items[nIndex];

		if (oItem.IsForm()) {
			if (oItem.IsWidget()) {
				oDocument.RemoveForm(oItem);
			}
			else {
				let nIdx = oDocument.widgetsParents.indexOf(oItem);
				if (nIdx != -1) {
					oDocument.widgetsParents.splice(nIdx, oItem);
				}
			}
		}
		else if (oItem.IsAnnot()) {
			let nPage = oItem.GetPage();
			oItem.AddToRedraw();

			oDocument.annots.splice(nPos, 1);
			oViewer.pagesInfo.pages[nPage].annots.splice(nPosInPage, 1);
			if (oItem.GetReply(0) != null || oItem.GetType() != AscPDF.ANNOTATIONS_TYPES.FreeText && oItem.GetContents())
				editor.sync_RemoveComment(oItem.GetId());
		}
		else if (oItem.IsDrawing()) {
			let nPage = oItem.GetPage();
			oItem.AddToRedraw();

			oDocument.drawings.splice(nPos, 1);
			oViewer.pagesInfo.pages[nPage].drawings.splice(nPosInPage, 1);
		}
	}
	
	oDocument.mouseDownAnnot = null;
};


/**
 * @constructor
 * @extends {AscDFH.CChangesBaseContentChange}
 */
function CChangesPDFDocumentAddPage(Class, Pos, Items)
{
	AscDFH.CChangesBaseContentChange.call(this, Class, Pos, Items, true);
}
CChangesPDFDocumentAddPage.prototype = Object.create(AscDFH.CChangesBaseContentChange.prototype);
CChangesPDFDocumentAddPage.prototype.constructor = CChangesPDFDocumentAddPage;
CChangesPDFDocumentAddPage.prototype.Type = AscDFH.historyitem_PDF_Document_AddPage;

CChangesPDFDocumentAddPage.prototype.Undo = function()
{
	let oDocument	= this.Class;
	let oDrDoc		= oDocument.GetDrawingDocument();
	
	for (var nIndex = 0, nCount = this.Items.length; nIndex < nCount; ++nIndex)
	{
		let nPos = true !== this.UseArray ? this.Pos : this.PosArray[nIndex];
		oDocument.RemovePage(nPos);
	}
	
	oDocument.SetMouseDownObject(null);
	oDrDoc.TargetEnd();
};
CChangesPDFDocumentAddPage.prototype.Redo = function()
{
	let oDocument	= this.Class;
	let oDrDoc		= oDocument.GetDrawingDocument();
	
	for (var nIndex = 0, nCount = this.Items.length; nIndex < nCount; ++nIndex)
	{
		let nPos = true !== this.UseArray ? this.Pos : this.PosArray[nIndex];
		let oItem = this.Items[nIndex];
		oDocument.AddPage(nPos, oItem)
	}

	oDocument.SetMouseDownObject(null);
	oDrDoc.TargetEnd();
};

/**
 * @constructor
 * @extends {AscDFH.CChangesBaseContentChange}
 */
function CChangesPDFDocumentRemovePage(Class, Pos, Items)
{
	AscDFH.CChangesBaseContentChange.call(this, Class, Pos, Items, true);
}
CChangesPDFDocumentRemovePage.prototype = Object.create(AscDFH.CChangesBaseContentChange.prototype);
CChangesPDFDocumentRemovePage.prototype.constructor = CChangesPDFDocumentRemovePage;
CChangesPDFDocumentRemovePage.prototype.Type = AscDFH.historyitem_PDF_Document_RemovePage;

CChangesPDFDocumentRemovePage.prototype.Undo = function()
{
	let oDocument	= this.Class;
	let oDrDoc		= oDocument.GetDrawingDocument();
	
	for (var nIndex = 0, nCount = this.Items.length; nIndex < nCount; ++nIndex)
	{
		let nPos = true !== this.UseArray ? this.Pos : this.PosArray[nIndex];
		let oItem = this.Items[nIndex];
		oDocument.AddPage(nPos, oItem);
	}
	
	oDocument.SetMouseDownObject(null);
	oDrDoc.TargetEnd();
};
CChangesPDFDocumentRemovePage.prototype.Redo = function()
{
	let oDocument	= this.Class;
	let oDrDoc		= oDocument.GetDrawingDocument();
	
	for (var nIndex = 0, nCount = this.Items.length; nIndex < nCount; ++nIndex)
	{
		let nPos = true !== this.UseArray ? this.Pos : this.PosArray[nIndex];
		oDocument.RemovePage(nPos)
	}

	oDocument.SetMouseDownObject(null);
	oDrDoc.TargetEnd();
};

/**
 * @constructor
 * @extends {AscDFH.CChangesBaseProperty}
 */
function CChangesPDFDocumentRotatePage(Class, Old, New, Color)
{
	AscDFH.CChangesBaseProperty.call(this, Class, Old, New, Color);
}
CChangesPDFDocumentRotatePage.prototype = Object.create(AscDFH.CChangesBaseProperty.prototype);
CChangesPDFDocumentRotatePage.prototype.constructor = CChangesPDFDocumentRotatePage;
CChangesPDFDocumentRotatePage.prototype.Type = AscDFH.historyitem_PDF_Document_RotatePage;
CChangesPDFDocumentRotatePage.prototype.private_SetValue = function(Value)
{
	let oDoc = this.Class;
	oDoc.SetPageRotate(Value[0], Value[1]);
};

/**
 * @constructor
 * @extends {AscDFH.CChangesBaseProperty}
 */
function CChangesPDFDocumentRecognizePage(Class, Old, New, Color)
{
	AscDFH.CChangesBaseProperty.call(this, Class, Old, New, Color);
}
CChangesPDFDocumentRecognizePage.prototype = Object.create(AscDFH.CChangesBaseProperty.prototype);
CChangesPDFDocumentRecognizePage.prototype.constructor = CChangesPDFDocumentRecognizePage;
CChangesPDFDocumentRecognizePage.prototype.Type = AscDFH.historyitem_PDF_Document_RecognizePage;
CChangesPDFDocumentRecognizePage.prototype.private_SetValue = function(Value)
{
	let oDoc = this.Class;
	let oFile = oDoc.Viewer.file;

	oFile.pages[Value[0]].isConvertedToShapes = Value[1];
};

/**
 * @constructor
 * @extends {AscDFH.CChangesBaseContentChange}
 */
function CChangesPDFDocumentChangePosInTree(Class, Pos, Items)
{
	AscDFH.CChangesBaseContentChange.call(this, Class, Pos, Items, true);
}
CChangesPDFDocumentChangePosInTree.prototype = Object.create(AscDFH.CChangesBaseContentChange.prototype);
CChangesPDFDocumentChangePosInTree.prototype.constructor = CChangesPDFDocumentChangePosInTree;
CChangesPDFDocumentChangePosInTree.prototype.Type = AscDFH.historyitem_PDF_Document_ChangePosInTree;

CChangesPDFDocumentChangePosInTree.prototype.Undo = function()
{
	let oDocument	= this.Class;
	let oDrDoc		= oDocument.GetDrawingDocument();
	
	for (var nIndex = 0, nCount = this.Items.length; nIndex < nCount; ++nIndex)
	{
		let nOldPos = this.Pos[0];
		oDocument.ChangeObjectPosInPageTree(this.Items[0], nOldPos);
	}
	
	oDocument.SetMouseDownObject(null);
	oDrDoc.TargetEnd();
};
CChangesPDFDocumentChangePosInTree.prototype.Redo = function()
{
	let oDocument	= this.Class;
	let oDrDoc		= oDocument.GetDrawingDocument();
	
	for (var nIndex = 0, nCount = this.Items.length; nIndex < nCount; ++nIndex)
	{
		let nNewPos = this.Pos[1];
		oDocument.ChangeObjectPosInPageTree(this.Items[0], nNewPos);
	}

	oDocument.SetMouseDownObject(null);
	oDrDoc.TargetEnd();
};
