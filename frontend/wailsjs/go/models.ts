export namespace models {
	
	export class FromTemplateConfig {
	    id: number;
	    template_id: number;
	    file_type: string;
	    header_row_index: number;
	    delimiter: string;
	    encoding: string;
	
	    static createFrom(source: any = {}) {
	        return new FromTemplateConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.template_id = source["template_id"];
	        this.file_type = source["file_type"];
	        this.header_row_index = source["header_row_index"];
	        this.delimiter = source["delimiter"];
	        this.encoding = source["encoding"];
	    }
	}
	export class MappingSource {
	    id: number;
	    mapping_id: number;
	    from_column_name: string;
	    from_column_index: number;
	    priority: number;
	
	    static createFrom(source: any = {}) {
	        return new MappingSource(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.mapping_id = source["mapping_id"];
	        this.from_column_name = source["from_column_name"];
	        this.from_column_index = source["from_column_index"];
	        this.priority = source["priority"];
	    }
	}
	export class Mapping {
	    id: number;
	    template_id: number;
	    to_column_name: string;
	    to_column_index: number;
	    mapping_type: string;
	    constant_value: string;
	    transform_rules: string;
	    sort_order: number;
	    sources: MappingSource[];
	
	    static createFrom(source: any = {}) {
	        return new Mapping(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.template_id = source["template_id"];
	        this.to_column_name = source["to_column_name"];
	        this.to_column_index = source["to_column_index"];
	        this.mapping_type = source["mapping_type"];
	        this.constant_value = source["constant_value"];
	        this.transform_rules = source["transform_rules"];
	        this.sort_order = source["sort_order"];
	        this.sources = this.convertValues(source["sources"], MappingSource);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class Template {
	    id: number;
	    name: string;
	    created_at: number;
	    updated_at: number;
	    template_config: FromTemplateConfig;
	    mappings: Mapping[];
	
	    static createFrom(source: any = {}) {
	        return new Template(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.created_at = source["created_at"];
	        this.updated_at = source["updated_at"];
	        this.template_config = this.convertValues(source["template_config"], FromTemplateConfig);
	        this.mappings = this.convertValues(source["mappings"], Mapping);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace template {
	
	export class ColumnInfo {
	    index: number;
	    name: string;
	
	    static createFrom(source: any = {}) {
	        return new ColumnInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.index = source["index"];
	        this.name = source["name"];
	    }
	}
	export class FromConfig {
	    path: string;
	    headerRow: number;
	    headers: ColumnInfo[];
	    fileType: string;
	    delimiter: string;
	    encoding: string;
	    previewRows: string[][];
	
	    static createFrom(source: any = {}) {
	        return new FromConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.headerRow = source["headerRow"];
	        this.headers = this.convertValues(source["headers"], ColumnInfo);
	        this.fileType = source["fileType"];
	        this.delimiter = source["delimiter"];
	        this.encoding = source["encoding"];
	        this.previewRows = source["previewRows"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RuleParams {
	    delimiter?: string;
	    index?: number;
	    format?: string;
	    length?: number;
	    padChar?: string;
	    convertType?: string;
	    prefix?: string;
	    replaceOld?: string;
	    replaceNew?: string;
	    direction?: string;
	
	    static createFrom(source: any = {}) {
	        return new RuleParams(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.delimiter = source["delimiter"];
	        this.index = source["index"];
	        this.format = source["format"];
	        this.length = source["length"];
	        this.padChar = source["padChar"];
	        this.convertType = source["convertType"];
	        this.prefix = source["prefix"];
	        this.replaceOld = source["replaceOld"];
	        this.replaceNew = source["replaceNew"];
	        this.direction = source["direction"];
	    }
	}
	export class TransformRule {
	    type: string;
	    params: RuleParams;
	
	    static createFrom(source: any = {}) {
	        return new TransformRule(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.params = this.convertValues(source["params"], RuleParams);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class MappingInput {
	    toField: ColumnInfo;
	    fromFields: ColumnInfo[];
	    type: string;
	    constantValue: string;
	    transformRules: TransformRule[];
	
	    static createFrom(source: any = {}) {
	        return new MappingInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.toField = this.convertValues(source["toField"], ColumnInfo);
	        this.fromFields = this.convertValues(source["fromFields"], ColumnInfo);
	        this.type = source["type"];
	        this.constantValue = source["constantValue"];
	        this.transformRules = this.convertValues(source["transformRules"], TransformRule);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

