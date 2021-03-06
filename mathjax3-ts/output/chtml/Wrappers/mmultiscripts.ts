/*************************************************************
 *
 *  Copyright (c) 2018 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

/**
 * @fileoverview  Implements the CHTMLmmultiscripts wrapper for the MmlMmultiscripts object
 *
 * @author dpvc@mathjax.org (Davide Cervone)
 */

import {CHTMLmsubsup} from './msubsup.js';
import {BBox} from '../BBox.js';
import {MmlMmultiscripts} from '../../../core/MmlTree/MmlNodes/mmultiscripts.js';
import {StyleList} from '../CssStyles.js';

/*****************************************************************/

/*
 * The data about the scripts and base
 */
export type ScriptData = {
    base: BBox;
    sub: BBox;   // combined bbox for all subscripts
    sup: BBox;   // combined bbox for all superscripts
    psub: BBox;  // combined bbox for all presubscripts
    psup: BBox;  // combined bbox for all presuperscripts
    numPrescripts: number;
    numScripts: number;
}
export type ScriptDataName = keyof ScriptData;

/*
 * The lists of all the individual script bboxes
 */
export type ScriptLists = {
    base: BBox[];
    subList: BBox[];
    supList: BBox[];
    psubList: BBox[];
    psupList: BBox[];
};
export type ScriptListName = keyof ScriptLists;

/*
 * The type of script that follows the given type
 */
export const NextScript: {[key: string]: ScriptListName} = {
    base: 'subList',
    subList: 'supList',
    supList: 'subList',
    psubList: 'psupList',
    psupList: 'psubList',
};

/*
 * The names of the scripts (for looping)
 */
export const ScriptNames = ['sup', 'sup', 'psup', 'psub'] as ScriptDataName[];

/*****************************************************************/
/*
 * The CHTMLmmultiscripts wrapper for the MmlMmultiscripts object
 *
 * @template N  The HTMLElement node class
 * @template T  The Text node class
 * @template D  The Document class
 */
export class CHTMLmmultiscripts<N, T, D> extends CHTMLmsubsup<N, T, D> {
    public static kind = MmlMmultiscripts.prototype.kind;

    public static styles: StyleList = {
        'mjx-prescripts': {
            display: 'inline-table',
            'padding-left': '.05em'   // scriptspace
        },
        'mjx-scripts': {
            display: 'inline-table',
            'padding-right': '.05em'   // scriptspace
        },
        'mjx-prescripts > mjx-row > mjx-cell': {
            'text-align': 'right'
        }
    };

    /*
     *  The cached data for the various bounding boxes
     */
    protected scriptData: ScriptData = null;

    /*
     *  The index of the child following the <mprescripts/> tag
     */
    protected firstPrescript = 0;

    /*************************************************************/

    /*
     * @override
     */
    public toCHTML(parent: N) {
        const chtml = this.standardCHTMLnode(parent);
        const data = this.getScriptData();
        //
        //  Combine the bounding boxes of the pre- and post-scripts,
        //  and get the resulting baseline offsets
        //
        const sub = this.combinePrePost(data.sub, data.psub);
        const sup = this.combinePrePost(data.sup, data.psup);
        const [u, v, q] = this.getUVQ(data.base, sub, sup);
        //
        //  Place the pre-scripts, then the base, then the post-scripts
        //
        if (data.numPrescripts) {
            this.addScripts(u, -v, true, data.psub, data.psup, this.firstPrescript, data.numPrescripts);
        }
        this.childNodes[0].toCHTML(chtml);
        if (data.numScripts) {
            this.addScripts(u, -v, false, data.sub, data.sup, 1, data.numScripts);
        }
    }

    /*
     * @param{BBox} pre   The prescript bounding box
     * @param{BBox} post  The postcript bounding box
     * @return{BBox}      The combined bounding box
     */
    protected combinePrePost(pre: BBox, post: BBox) {
        const bbox = new BBox(pre);
        bbox.combine(post, 0, 0);
        return bbox;
    }

    /*
     * Create a table with the super and subscripts properly separated and aligned.
     *
     * @param{number} u       The baseline offset for the superscripts
     * @param{number} v       The baseline offset for the subscripts
     * @param{boolean} isPre  True for prescripts, false for scripts
     * @param{BBox} sub       The subscript bounding box
     * @param{BBox} sup       The superscript bounding box
     * @param{number} i       The starting index for the scripts
     * @param{number} n       The number of sub/super-scripts
     */
    protected addScripts(u: number, v: number, isPre: boolean, sub: BBox, sup: BBox, i: number, n: number) {
        const adaptor = this.adaptor;
        const q = (u - sup.d) + (v - sub.h);             // separation of scripts
        const U = (u < 0 && v === 0 ? sub.h + u : u);    // vertical offset of table
        const rowdef = (q > 0 ? {style: {height: this.em(q)}} : {});
        const tabledef = (U ? {style: {'vertical-align': this.em(U)}} : {});
        const supRow = this.html('mjx-row');
        const sepRow = this.html('mjx-row', rowdef);
        const subRow = this.html('mjx-row');
        const name = 'mjx-' + (isPre ? 'pre' : '') + 'scripts';
        adaptor.append(this.chtml, this.html(name, tabledef, [supRow, sepRow, subRow]));
        let m = i + 2 * n;
        while (i < m) {
            this.childNodes[i++].toCHTML(adaptor.append(subRow, this.html('mjx-cell')) as N);
            this.childNodes[i++].toCHTML(adaptor.append(supRow, this.html('mjx-cell')) as N);
        }
    }

    /*************************************************************/

    /*
     * @override
     */
    public computeBBox(bbox: BBox) {
        //
        // Get the bounding boxes, and combine the pre- and post-scripts
        //  to get a common offset for both
        //
        const scriptspace = this.font.params.scriptspace;
        const data = this.getScriptData();
        const sub = this.combinePrePost(data.sub, data.psub);
        const sup = this.combinePrePost(data.sup, data.psup);
        const [u, v] = this.getUVQ(data.base, sub, sup);
        //
        //  Lay out the pre-scripts, then the base, then the post-scripts
        //
        bbox.empty();
        if (data.numPrescripts) {
            bbox.combine(data.psup, scriptspace, u);
            bbox.combine(data.psub, scriptspace, v);
        }
        bbox.append(data.base);
        if (data.numScripts) {
            const w = bbox.w;
            bbox.combine(data.sup, w, u);
            bbox.combine(data.sub, w, v);
            bbox.w += scriptspace;
        }
        bbox.clean();
    }

    /*
     * @return{ScriptData}   The bounding box information about all the scripts
     */
    protected getScriptData() {
        //
        //  Return cached data, if any
        //
        if (this.scriptData) {
            return this.scriptData;
        }
        //
        //  Initialize the bounding box data
        //
        const data: ScriptData = this.scriptData = {
            base: null, sub: BBox.empty(), sup: BBox.empty(), psub: BBox.empty(), psup: BBox.empty(),
            numPrescripts: 0, numScripts: 0
        }
        //
        //  Get the bboxes for all the scripts and combine them into the scriptData
        //
        const lists = this.getScriptBBoxLists();
        this.combineBBoxLists(data.sub, data.sup, lists.subList, lists.supList);
        this.combineBBoxLists(data.psub, data.psup, lists.psubList, lists.psupList);
        this.scriptData.base = lists.base[0];
        //
        //  Save the lengths and return the data
        //
        this.scriptData.numPrescripts = lists.psubList.length;
        this.scriptData.numScripts = lists.subList.length;
        return this.scriptData;
    }

    /*
     * @return{ScriptLists}  The bounding boxes for all the scripts divided into lists by position
     */
    protected getScriptBBoxLists() {
        const lists: ScriptLists = {
            base: [], subList: [], supList: [], psubList: [], psupList: []
        }
        //
        // The first entry is the base, and then they altername sub- and superscripts.
        // Once we find the <mprescripts/> element, switch to presub- and presuperscript lists.
        //
        let script: ScriptListName = 'base';
        for (const child of this.childNodes) {
            if (child.node.isKind('mprescripts')) {
                script = 'psubList';
            } else {
                lists[script].push(child.getBBox());
                script = NextScript[script];
            }
        }
        //
        //  The index of the first prescript (skip over base, sub- and superscripts, and mprescripts)
        //
        this.firstPrescript = lists.subList.length + lists.supList.length + 2;
        //
        //  Make sure the lists are the same length
        //
        this.padLists(lists.subList, lists.supList);
        this.padLists(lists.psubList, lists.psupList);
        return lists;
    }

    /*
     * Pad the second list, if it is one short
     *
     * @param{BBox[]} list1   The first list
     * @param{BBox[]} list2   The second list
     */
    protected padLists(list1: BBox[], list2: BBox[]) {
        if (list1.length > list2.length) {
            list2.push(BBox.empty());
        }
    }

    /*
     * @param{BBox} bbox1    The bbox for the combined subscripts
     * @param{BBox} bbox2    The bbox for the combined superscripts
     * @param{BBox[]} list1  The list of subscripts to combine
     * @param{BBox[]} list2  The list of superscripts to combine
     */
    protected combineBBoxLists(bbox1: BBox, bbox2: BBox, list1: BBox[], list2: BBox[]) {
        for (let i = 0; i < list1.length; i++) {
            const [w1, h1, d1] = this.getScaledWHD(list1[i]);
            const [w2, h2, d2] = this.getScaledWHD(list2[i]);
            const w = Math.max(w1, w2);
            bbox1.w += w;
            bbox2.w += w;
            if (h1 > bbox1.h) bbox1.h = h1;
            if (d1 > bbox1.d) bbox1.d = d1;
            if (h2 > bbox2.h) bbox2.h = h2;
            if (d2 > bbox2.d) bbox2.d = d2;
        }
    }

    /*
     * @param{BBox} bbox  The bounding box from which to get the (scaled) width, height, and depth
     */
    protected getScaledWHD(bbox: BBox) {
        const {w, h, d, rscale} = bbox;
        return [w * rscale, h * rscale, d * rscale];
    }

    /*************************************************************/

    /*
     * @override
     */
    protected getUVQ(basebox: BBox, subbox: BBox, supbox: BBox) {
        if (!this.UVQ) {
            let [u, v, q] = [0, 0 ,0];
            if (subbox.h === 0 && subbox.d === 0) {
                //
                //  Use placement for superscript only
                //
                u = this.getU(basebox, supbox);
            } else if (supbox.h === 0 && supbox.d === 0) {
                //
                //  Use placement for subsccript only
                //
                u = -this.getV(basebox, subbox);
            } else {
                //
                //  Use placement for both
                //
                [u, v, q] = super.getUVQ(basebox, subbox, supbox);
            }
            this.UVQ = [u, v, q];
        }
        return this.UVQ;
    }

}
