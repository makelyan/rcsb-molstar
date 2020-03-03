/**
 * Copyright (c) 2019-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import { DefaultPluginSpec } from 'molstar/lib/mol-plugin';
import { Plugin } from 'molstar/lib/mol-plugin-ui/plugin'
import './index.html'
import './favicon.ico'
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { PluginCommands } from 'molstar/lib/mol-plugin/commands';
import { PluginBehaviors } from 'molstar/lib/mol-plugin/behavior';
import { AnimateModelIndex } from 'molstar/lib/mol-plugin-state/animation/built-in';
import { SupportedFormats, StructureViewerState, StructureViewerProps, LoadParams } from './types';
import { ControlsWrapper, ViewportWrapper } from './ui/controls';
import { PluginSpec } from 'molstar/lib/mol-plugin/spec';
import { StructureRepresentationInteraction } from 'molstar/lib/mol-plugin/behavior/dynamic/selection/structure-representation-interaction';

import { ColorNames } from 'molstar/lib/mol-util/color/names';
import { StructureView } from './helpers/structure';
import ReactDOM = require('react-dom');
import React = require('react');
import { ModelLoader } from './helpers/model';
import { VolumeData } from './helpers/volume';
import { PresetManager, PresetProps } from './helpers/preset';
require('./skin/rcsb.scss')

/** package version, filled in at bundle build time */
declare const __RCSB_MOLSTAR_VERSION__: string
export const RCSB_MOLSTAR_VERSION = __RCSB_MOLSTAR_VERSION__;

export const DefaultStructureViewerProps: StructureViewerProps = {
    volumeServerUrl: '//maps.rcsb.org/',
    modelUrlProvider: (pdbId: string) => {
        const id = pdbId.toLowerCase()
        return {
            url: `//models.rcsb.org/${id}.bcif`,
            format: 'bcif' as SupportedFormats
        }
    },
    showOpenFileControls: false,
}

export class StructureViewer {
    private readonly plugin: PluginContext;
    private readonly props: Readonly<StructureViewerProps>

    private get customState() {
        return this.plugin.customState as StructureViewerState
    }

    constructor(target: string | HTMLElement, props: Partial<StructureViewerProps> = {}) {
        target = typeof target === 'string' ? document.getElementById(target)! : target

        this.props = { ...DefaultStructureViewerProps, ...props }

        this.plugin = new PluginContext({
            ...DefaultPluginSpec,
            behaviors: [
                PluginSpec.Behavior(PluginBehaviors.Representation.HighlightLoci),
                PluginSpec.Behavior(PluginBehaviors.Representation.SelectLoci),
                PluginSpec.Behavior(PluginBehaviors.Representation.DefaultLociLabelProvider),
                PluginSpec.Behavior(PluginBehaviors.Camera.FocusLoci, {
                    minRadius: 8,
                    extraRadius: 4
                }),
                PluginSpec.Behavior(StructureRepresentationInteraction),

                PluginSpec.Behavior(PluginBehaviors.CustomProps.AccessibleSurfaceArea),
                PluginSpec.Behavior(PluginBehaviors.CustomProps.Interactions),
                PluginSpec.Behavior(PluginBehaviors.CustomProps.RCSBAssemblySymmetry),
                PluginSpec.Behavior(PluginBehaviors.CustomProps.RCSBValidationReport),

            ],
            animations: [
                AnimateModelIndex
            ],
            layout: {
                initial: {
                    isExpanded: false,
                    showControls: true,
                    controlsDisplay: 'reactive'
                },
                controls: {
                    left: 'none',
                    right: ControlsWrapper,
                    bottom: 'none'
                },
                viewport: ViewportWrapper
            }
        });

        (this.plugin.customState as StructureViewerState) = {
            props: this.props,

            modelLoader: new ModelLoader(this.plugin),
            presetManager: new PresetManager(this.plugin),
            structureView: new StructureView(this.plugin),
            volumeData: new VolumeData(this.plugin),
        }

        ReactDOM.render(React.createElement(Plugin, { plugin: this.plugin }), target)

        const renderer = this.plugin.canvas3d!.props.renderer;
        PluginCommands.Canvas3D.SetSettings(this.plugin, { settings: { renderer: { ...renderer, backgroundColor: ColorNames.white } } })

        PluginCommands.Toast.Show(this.plugin, {
            title: 'Welcome',
            message: `RCSB PDB Mol* Viewer ${RCSB_MOLSTAR_VERSION}`,
            key: 'toast-welcome',
            timeoutMs: 5000
        })
    }

    async load(load: LoadParams, props?: PresetProps) {
        await this.customState.modelLoader.load(load)
        await this.customState.presetManager.apply(props)
    }

    async loadPdbId(pdbId: string, props?: PresetProps) {
        const p = this.props.modelUrlProvider(pdbId)
        await this.load({ fileOrUrl: p.url, format: p.format }, props)
    }

    async loadUrl(url: string, props?: PresetProps) {
        await this.load({ fileOrUrl: url, format: 'cif', }, props)
    }
}