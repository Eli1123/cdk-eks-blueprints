import { loadExternalYaml, userLog } from "../../utils";
import { HelmChartConfiguration } from "./kubectl-provider";

export type HelmChartVersion = Omit<HelmChartConfiguration, "name" | "namespace" |  "release" | "values">;

/**
 * Semver comparator, simplistic implementation. Might require additional 
 * logic for correct semver comparison.
 * 
 * @param a 
 * @param b 
 * @returns 
 */
const semverComparator = (a: string, b: string) => { 
    const a1 = a.split('.');
    const b1 = b.split('.');

    const len = Math.min(a1.length, b1.length);
    for (let i = 0; i < len; i++) {
        const a2 = +a1[ i ] || 0;
        const b2 = +b1[ i ] || 0;
        
        if (a2 !== b2) {
            return a2 > b2 ? -1 : 1;
        }
    }

    return b1.length - a1.length;
};

/**
 * Represent result of helm chart version validation against newer versions
 */
export interface CheckVersionResult {

    /**
     * Contains the highest version of the helm chart discovered in the helm chart repository.
     */
    highestVersion: string | undefined,
    
    /**
     * True if the provided version is the latest version in the helm chart repository. Otherwise, false.
     */
    latestVersion: boolean,

    /**
     * All discovered versions of the chart, discovered in the provided helm chart repository.
     */
    allVersions: string[];
}

/**
 * Lists chart versions for a given helm chart.
 * @param chart 
 * @returns 
 */
export function listChartVersions(chart: HelmChartVersion): string[] {
    // TODO make function async and use async HTTP client to get results
    const helmRepository = loadExternalYaml(chart.repository + "/index.yaml");
    const versions: string[] = Object.values(helmRepository[0]['entries'][chart.chart])
        .map((e: any) => { return e['version']; });
    return versions.filter(e => e.includes("."));
}

/**
 * Checks the provided helm chart version against the repository.
 * Validation is successful if there is no higher version registered in the repository. 
 * @param chart 
 * @returns 
 */
export function checkHelmChartVersion(chart: HelmChartVersion) : CheckVersionResult {
    let versions = listChartVersions(chart);
    if(versions === null || versions.length == 0) {
        console.error("No versions are found for " + chart.chart + " in repository " + chart.repository );
        return {
            allVersions: versions,
            highestVersion: undefined,
            latestVersion: false
        };
    }
    versions = versions.sort(semverComparator);
    const latestVersion = (versions[0] === chart.version);
    if(latestVersion) {
        userLog.info(`Chart ${chart.chart}-${chart.version} is at the latest version.` );
    }
    else {
        userLog.warn(`Upgrade is needed for chart ${chart.chart}-${chart.version}: latest version is ${versions[0]}.`);
    }
    return {
        allVersions: versions,
        highestVersion: versions[0],
        latestVersion: latestVersion
    };
}