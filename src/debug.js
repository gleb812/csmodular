export class PatchDebugger {
    static logSystemState(system) {
        console.log('=== SYSTEM STATE ===');
        console.log(`Components: ${system.components.length}`);
        console.log(`Modules (Panels): ${system.components.filter(c => c.constructor.name === 'Panel').length}`);
        console.log(`Cables: ${system.patchManager?.cables?.length || 0}`);
        
        if (system.layerManager) {
            console.log('\n=== LAYER STATE ===');
            const voiceModules = system.layerManager.layers.voice.modules.length;
            const fxModules = system.layerManager.layers.fx.modules.length;
            console.log(`Voice layer: ${voiceModules} modules`);
            console.log(`FX layer: ${fxModules} modules`);
        }
        
        if (system.patchLoader?.moduleMap) {
            console.log('\n=== MODULE MAP ===');
            const mapKeys = Object.keys(system.patchLoader.moduleMap);
            console.log(`Entries: ${mapKeys.length}`);
            mapKeys.forEach(key => {
                const module = system.patchLoader.moduleMap[key];
                console.log(`  ${key}: ${module.jsonName || module.title} (layer: ${module.layer})`);
            });
        }
        
        console.log('=== END SYSTEM STATE ===\n');
    }
    
    static logModuleDetails(module) {
        console.log('=== MODULE DETAILS ===');
        console.log(`Title: ${module.title}`);
        console.log(`ModuleId: ${module.moduleId}`);
        console.log(`JSON ID: ${module.jsonId}`);
        console.log(`JSON Name: ${module.jsonName}`);
        console.log(`Layer: ${module.layer}`);
        console.log(`Grid: [${module.gridX}, ${module.gridY}]`);
        console.log(`Components: ${module.components.length}`);
        
        module.components.forEach((comp, i) => {
            console.log(`  [${i}] ${comp.constructor?.name || 'Unknown'}: id=${comp.id}, ConnectorIndex=${comp.ConnectorIndex}`);
        });
        
        console.log('=== END MODULE DETAILS ===\n');
    }

}