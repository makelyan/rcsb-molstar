/**
 * Copyright (c) 2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Mandar Deshpande <mandar@ebi.ac.uk>
 */

import { OrderedSet } from 'molstar/lib/mol-data/int';
import { AlphaFoldConfidence, AlphaFoldConfidenceProvider } from './prop';
import { AlphaFoldConfidenceColorThemeProvider } from './color';
import { Loci } from 'molstar/lib/mol-model/loci';
import { StructureElement } from 'molstar/lib/mol-model/structure';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { PluginBehavior } from 'molstar/lib/mol-plugin/behavior/behavior';

export const AlphaFoldConfidenceScore = PluginBehavior.create<{ autoAttach: boolean, showTooltip: boolean }>({
    name: 'af-confidence-prop',
    category: 'custom-props',
    display: {
        name: 'AlphaFold Confidence Score',
        description: 'AlphaFold Confidence Score.'
    },
    ctor: class extends PluginBehavior.Handler<{ autoAttach: boolean, showTooltip: boolean }> {
        private provider = AlphaFoldConfidenceProvider

        private labelProvider = {
            label: (loci: Loci): string | undefined => {
                if (!this.params.showTooltip) return;

                switch (loci.kind) {
                    case 'element-loci':
                        if (loci.elements.length === 0) return;
                        const e = loci.elements[0];
                        const u = e.unit;
                        if (!u.model.customProperties.hasReference(AlphaFoldConfidenceProvider.descriptor)) return;

                        const se = StructureElement.Location.create(loci.structure, u, u.elements[OrderedSet.getAt(e.indices, 0)]);
                        const confidenceScore = AlphaFoldConfidence.getConfidenceScore(se);
                        return confidenceScore ? `Confidence score: ${confidenceScore[0]} <small>( ${confidenceScore[1]} )</small>` : `No confidence score`;

                    default: return;
                }
            }
        }

        register(): void {
            this.ctx.customModelProperties.register(this.provider, this.params.autoAttach);
            this.ctx.managers.lociLabels.addProvider(this.labelProvider);

            this.ctx.representation.structure.themes.colorThemeRegistry.add(AlphaFoldConfidenceColorThemeProvider);
        }

        update(p: { autoAttach: boolean, showTooltip: boolean }) {
            const updated = this.params.autoAttach !== p.autoAttach;
            this.params.autoAttach = p.autoAttach;
            this.params.showTooltip = p.showTooltip;
            this.ctx.customModelProperties.setDefaultAutoAttach(this.provider.descriptor.name, this.params.autoAttach);
            return updated;
        }

        unregister() {
            this.ctx.customModelProperties.unregister(AlphaFoldConfidenceProvider.descriptor.name);
            this.ctx.managers.lociLabels.removeProvider(this.labelProvider);
            this.ctx.representation.structure.themes.colorThemeRegistry.remove(AlphaFoldConfidenceColorThemeProvider);
        }
    },
    params: () => ({
        autoAttach: PD.Boolean(false),
        showTooltip: PD.Boolean(true)
    })
});