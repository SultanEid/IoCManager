rule DeTechTive_Bulk_Yara_Alpha
{
    meta:
        description = "Safe bulk YARA marker for Alpha"
    strings:
        $marker = "DeTechTiveBulkYaraAlpha" ascii wide nocase
    condition:
        $marker
}

rule DeTechTive_Bulk_Yara_Beta
{
    meta:
        description = "Safe bulk YARA marker for Beta"
    strings:
        $marker = "DeTechTiveBulkYaraBeta" ascii wide nocase
    condition:
        $marker
}

rule DeTechTive_Bulk_Yara_Gamma
{
    meta:
        description = "Safe bulk YARA marker for Gamma"
    strings:
        $marker = "DeTechTiveBulkYaraGamma" ascii wide nocase
    condition:
        $marker
}

rule DeTechTive_Bulk_Yara_Delta
{
    meta:
        description = "Safe bulk YARA marker for Delta"
    strings:
        $marker = "DeTechTiveBulkYaraDelta" ascii wide nocase
    condition:
        $marker
}

rule DeTechTive_Bulk_Yara_Epsilon
{
    meta:
        description = "Safe bulk YARA marker for Epsilon"
    strings:
        $marker = "DeTechTiveBulkYaraEpsilon" ascii wide nocase
    condition:
        $marker
}
